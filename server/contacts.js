// server/routes/contactRouter.js
const express = require("express");
const router = express.Router();
const db = require("./database"); // getConnection -> יחזיר את אותו חיבור
const nodemailer = require("nodemailer");

/* ======= עזרה קטנה ======= */
function isEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || ""));
}
function nonEmpty(v) {
  return typeof v === "string" && v.trim().length > 0;
}
const TYPE_VALUES = new Set(["general", "report"]);
const ROLE_VALUES = new Set(["user", "system"]); // "system" = המנהל/המערכת

/* ======= מייל אופציונלי (אם תגדירי .env) ======= */
let transporter = null;
if (process.env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
}
async function sendSystemMail(to, subject, html) {
  if (!transporter) return { sent: false, reason: "mailer disabled" };
  const from = process.env.FROM_EMAIL || "no-reply@bidsmart.local";
  const info = await transporter.sendMail({ from, to, subject, html });
  return { sent: true, messageId: info.messageId };
}






/* ==========================================================
   1) יצירת טיקט (כללי/דיווח)
   POST /api/contacts
   body: { type_message, product_id?, subject, email, first_name, last_name }
   סטטוס ברירת מחדל אצלך הוא 'unread'
========================================================== */
router.post("/", async (req, res) => {
  const {
    type_message,
    product_id = "",
    subject,
    email,
    first_name,
    last_name,
  } = req.body || {};

  // ולידציות בסיס
  if (!TYPE_VALUES.has(type_message)) {
    return res.status(400).json({ success: false, message: "type_message must be 'general' or 'report'" });
  }
  if (type_message === "report" && !nonEmpty(product_id)) {
    return res.status(400).json({ success: false, message: "product_id is required for report" });
  }
  if (!nonEmpty(subject) || subject.trim().length < 3) {
    return res.status(400).json({ success: false, message: "subject is too short" });
  }
  if (!isEmail(email)) {
    return res.status(400).json({ success: false, message: "invalid email" });
  }
  if (!nonEmpty(first_name) || !nonEmpty(last_name)) {
    return res.status(400).json({ success: false, message: "first_name and last_name are required" });
  }

  try {
    const conn = await db.getConnection();

    // מייצרות UUID בצד ה־DB (כדי לא להוסיף חבילה ב־npm)
    const [[{ uuid }]] = await conn.query("SELECT UUID() AS uuid");

    // הכנסת טיקט (שימי לב: status ברירת מחדל אצלך הוא 'unread' בסכימה)
    const insertSql = `
      INSERT INTO tickets
        (ticket_id, type_message, product_id, subject, email, first_name, last_name)
      VALUES
        (?, ?, NULLIF(?, ''), ?, ?, ?, ?)
    `;
    await conn.execute(insertSql, [
      uuid,
      type_message,
      product_id,                 // יישמר NULL אם מחרוזת ריקה
      subject.trim(),
      email.trim(),
      first_name.trim(),
      last_name.trim(),
    ]);

    return res.status(201).json({ success: true, ticket_id: uuid });
  } catch (err) {
    console.error("POST /api/contacts error:", err);
    return res.status(500).json({ success: false, message: "DB error creating ticket" });
  }
});

/* ==========================================================
   2) הוספת הודעה לטיקט
   POST /api/contacts/:ticketId/message
   body: { sender_role: 'user' | 'system', body }
   לוגיקת סטטוס:
   - user: נשאיר 'unread' (או רק נעדכן updated_at)
   - system: נסמן 'read' (או 'progress' אם תרצי)
========================================================== */
router.post("/:ticketId/message", async (req, res) => {
  const ticketId = String(req.params.ticketId || "");
  const { sender_role, body } = req.body || {};

  if (!ROLE_VALUES.has(sender_role)) {
    return res.status(400).json({ success: false, message: "sender_role must be 'user' or 'system'" });
  }
  if (!nonEmpty(body) || body.trim().length < 2) {
    return res.status(400).json({ success: false, message: "message body is too short" });
  }

  try {
    const conn = await db.getConnection();

    // ודאי שהטיקט קיים וקחי פרטים למייל
    const [rows] = await conn.execute(
      "SELECT email, subject FROM tickets WHERE ticket_id = ? LIMIT 1",
      [ticketId]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: "ticket not found" });
    }
    const ticket = rows[0];

    // message_id מה־DB
    const [[{ uuid: messageId }]] = await conn.query("SELECT UUID() AS uuid");

    // הכנסה לטבלת ההודעות
    await conn.execute(
      "INSERT INTO ticket_messages (message_id, ticket_id, sender_role, body) VALUES (?, ?, ?, ?)",
      [messageId, ticketId, sender_role, body.trim()]
    );

    // סטטוס
    if (sender_role === "system") {
      await conn.execute(
        "UPDATE tickets SET status = 'read', updated_at = CURRENT_TIMESTAMP WHERE ticket_id = ?",
        [ticketId]
      );
    } else {
      await conn.execute(
        "UPDATE tickets SET updated_at = CURRENT_TIMESTAMP WHERE ticket_id = ?",
        [ticketId]
      );
    }

    // אם זו הודעת מערכת – שליחת מייל (אופציונלי)
    let mail = { sent: false };
    if (sender_role === "system") {
      try {
        const mailSubject = `מענה לפנייה: ${ticket.subject}`;
        const html = `<p>${body.trim().replace(/\n/g, "<br/>")}</p>`;
        mail = await sendSystemMail(ticket.email, mailSubject, html);
      } catch (e) {
        console.warn("send mail failed:", e.message);
      }
    }

    return res.status(201).json({ success: true, message_id: messageId, mail });
  } catch (err) {
    console.error("POST /api/contacts/:ticketId/message error:", err);
    return res.status(500).json({ success: false, message: "DB error inserting message" });
  }
});


/* ==========================================================
   1.1) יצירת טיקט מסוג "report" מתוך משתמש מחובר
   POST /api/contacts/report
   body: { product_id, subject, body }
   - first_name/last_name/email נמשכים מ-req.user
   - יוצר רשומה ב-tickets וגם הודעה ראשונה ב-ticket_messages
========================================================== */
router.post("/report", async (req, res) => {
  const u = req.session.user;
  if (!u || !u.email) {
    return res.status(401).json({ success: false, message: "Login required" });
  }

  const { product_id, subject, body } = req.body || {};
  const pid = String(product_id ?? "").trim();   // <-- המרה למחרוזת

  if (!pid) {
    return res.status(400).json({ success: false, message: "product_id is required" });
  }
  if (!nonEmpty(String(subject || "")) || String(subject).trim().length < 3) {
    return res.status(400).json({ success: false, message: "subject is too short" });
  }
  if (!nonEmpty(String(body || "")) || String(body).trim().length < 10) {
    return res.status(400).json({ success: false, message: "body is too short (min 10 chars)" });
  }

  try {
    const conn = await db.getConnection();
    const [[{ uuid: ticketId }]] = await conn.query("SELECT UUID() AS uuid");

    await conn.execute(
      `INSERT INTO tickets
        (ticket_id, type_message, product_id, subject, email, first_name, last_name, created_at, updated_at)
       VALUES
        (?, 'report', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [ticketId, pid, subject.trim(), String(u.email).trim(),
       String(u.first_name || "").trim(), String(u.last_name || "").trim()]
    );

    const [[{ uuid: messageId }]] = await conn.query("SELECT UUID() AS uuid");
    await conn.execute(
      `INSERT INTO ticket_messages (message_id, ticket_id, sender_role, body, created_at)
       VALUES (?, ?, 'user', ?, CURRENT_TIMESTAMP)`,
      [messageId, ticketId, body.trim()]
    );

    await conn.execute("UPDATE tickets SET updated_at = CURRENT_TIMESTAMP WHERE ticket_id = ?", [ticketId]);
    return res.status(201).json({ success: true, ticket_id: ticketId, message_id: messageId });
  } catch (err) {
    console.error("POST /api/contacts/report error:", err);
    return res.status(500).json({ success: false, message: "DB error creating report ticket" });
  }
});


module.exports = router;
