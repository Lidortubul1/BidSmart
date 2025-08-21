// server/routes/contacts.js
const express = require("express");
const router = express.Router();
const db = require("./database");
const nodemailer = require("nodemailer");
require("dotenv").config();

/* -------------------------------------------------------
   פונקציות עזר
-------------------------------------------------------- */
function isEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || ""));
}
function nonEmpty(v) {
  return typeof v === "string" && v.trim().length > 0;
}
// המרת טקסט ל-HTML מאובטח
function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function toHtml(s) {
  return esc(s).replace(/\r?\n/g, "<br/>");
}

/* -------------------------------------------------------
   סטים של ערכים מותרים
-------------------------------------------------------- */
const TYPE_VALUES   = new Set(["general", "report", "admin_seller"]); // סוגי טיקט
const STATUS_VALUES = new Set(["unread", "progress", "read"]);        // סטטוסים
const ROLE_VALUES   = new Set(["user", "system"]);                    // תפקיד שולח

/* -------------------------------------------------------
   הרשאת מנהל
-------------------------------------------------------- */
function adminGuard(req, res, next) {
  const u = req.session?.user;
  if (!u || u.role !== "admin") {
    return res.status(403).json({ success: false, message: "admin only" });
  }
  next();
}

/* -------------------------------------------------------
   Nodemailer – SMTP אם הוגדר, אחרת Gmail (MAIL_USER/PASS)
-------------------------------------------------------- */
let transporter = null;

if (process.env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "").toLowerCase() === "true", // true אם 465
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  console.log("[contacts] mail mode: SMTP");
} else if (process.env.MAIL_USER && process.env.MAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS, // App Password
    },
  });
  console.log("[contacts] mail mode: Gmail");
} else {
  console.warn("[contacts] Mail transport disabled (no SMTP / MAIL_USER)");
}

async function sendSystemMail(to, subject, html) {
  if (!transporter) return { sent: false, reason: "mailer disabled" };
  const from =
    process.env.FROM_EMAIL || process.env.MAIL_USER || "no-reply@bidsmart.local";
  try {
    const info = await transporter.sendMail({ from, to, subject, html, replyTo: from });
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error("[contacts] send mail failed:", err.message);
    return { sent: false, reason: err.message };
  }
}

if (transporter) {
  transporter
    .verify()
    .then(() => console.log("[contacts] mail transporter ready"))
    .catch((e) => console.error("[contacts] mail verify failed:", e.message));
}

/* -------------------------------------------------------
   שרשור-אב לדיווחי מוצר (ריכוז דיווחים לאותו מוצר)
-------------------------------------------------------- */
async function getOrCreateReportParent(conn, productId) {
  const [parents] = await conn.execute(
    `SELECT ticket_id FROM tickets
      WHERE type_message='report' AND product_id=? AND related_ticket_id IS NULL
      ORDER BY created_at ASC LIMIT 1`,
    [productId]
  );
  if (parents.length) return parents[0].ticket_id;

  const [[{ uuid: parentId }]] = await conn.query("SELECT UUID() AS uuid");
  await conn.execute(
    `INSERT INTO tickets
      (ticket_id, type_message, product_id, subject, email, first_name, last_name, status, related_ticket_id, created_at, updated_at)
     VALUES
      (?, 'report', ?, ?, 'no-reply@bidsmart.local', 'מערכת', 'BidSmart', 'unread', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [parentId, productId, `דיווחים על מוצר #${productId}`]
  );
  return parentId;
}

/* =======================================================================
   API למסכי אדמין / עזר
======================================================================= */

// כל הדיווחים של מוצר (ל-drilldown, למשל ברשימת המוצר)
router.get("/by-product/:pid", async (req, res) => {
  const pid = String(req.params.pid || "");
  try {
    const conn = await db.getConnection();
    const [rows] = await conn.execute(
      `SELECT ticket_id, type_message, subject, email, first_name, last_name, status, created_at, updated_at, related_ticket_id
         FROM tickets
        WHERE product_id = ? AND type_message = 'report' AND related_ticket_id IS NOT NULL
        ORDER BY updated_at DESC`,
      [pid]
    );
    res.json({ success: true, tickets: rows });
  } catch (e) {
    console.error("GET /api/contacts/by-product error:", e);
    res.status(500).json({ success: false, message: "DB error" });
  }
});

/**
 * GET /api/contacts
 * סינון רשימת טיקטים
 * ?type=general|report|admin_seller
 * ?status=unread|progress|read
 * ?q=טקסט חופשי
 * הערה: עבור type=report אפשר להציג רק הורים ולצרף מונה דיווחים
 */
router.get("/", async (req, res) => {
  const { type, status, q } = req.query;

  try {
    const conn = await db.getConnection();

    // אם מבקשים דיווחים – נחזיר רק "הורים" + מונה
    if (type === "report") {
      const where = ["t.type_message='report'", "t.related_ticket_id IS NULL"];
      const vals = [];
      if (status && STATUS_VALUES.has(status)) { where.push("t.status=?"); vals.push(status); }
      if (q && String(q).trim()) {
        const like = `%${String(q).trim()}%`;
        where.push("(t.subject LIKE ? OR t.email LIKE ? OR t.first_name LIKE ? OR t.last_name LIKE ?)");
        vals.push(like, like, like, like);
      }

      const [rows] = await conn.execute(
        `SELECT
           t.ticket_id, t.type_message, t.product_id, t.subject, t.email,
           t.first_name, t.last_name, t.status, t.created_at, t.updated_at,
           (SELECT COUNT(*) FROM tickets c WHERE c.related_ticket_id = t.ticket_id) AS reports_count
         WHERE ${where.join(" AND ")}
         ORDER BY t.updated_at DESC
         LIMIT 300`,
        vals
      );
      return res.json({ success: true, tickets: rows });
    }

    // ברירת מחדל – סינון רגיל
    const where = [];
    const vals = [];
    if (type && TYPE_VALUES.has(type)) { where.push("type_message = ?"); vals.push(type); }
    if (status && STATUS_VALUES.has(status)) { where.push("status = ?"); vals.push(status); }
    if (q && String(q).trim()) {
      const like = `%${String(q).trim()}%`;
      where.push("(subject LIKE ? OR email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)");
      vals.push(like, like, like, like);
    }

    const sql = `
      SELECT ticket_id, type_message, product_id, subject, email,
             first_name, last_name, status, created_at, updated_at, related_ticket_id
      FROM tickets
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY updated_at DESC
      LIMIT 300
    `;
    const [rows] = await conn.execute(sql, vals);
    res.json({ success: true, tickets: rows });
  } catch (e) {
    console.error("GET /api/contacts error:", e);
    res.status(500).json({ success: false, message: "DB error" });
  }
});

/**
 * GET /api/contacts/:ticketId/messages
 * אם זה טיקט דיווח:
 *  - מאתרים הורה (related_ticket_id או self)
 *  - מחזירים כל המסרים של ההורה וכל הילדים (רציף כרונולוגית)
 * אחרת:
 *  - מחזירים את המסרים של אותו טיקט בלבד
 */
router.get("/:ticketId/messages", async (req, res) => {
  const ticketId = String(req.params.ticketId || "");
  const scope = String(req.query.scope || "").toLowerCase(); // '' | 'self'
  const childOnly = scope === "self" || req.query.childOnly === "1";

  try {
    const conn = await db.getConnection();

    const [[row]] = await conn.execute(
      "SELECT type_message, COALESCE(related_ticket_id, ticket_id) AS parent_id FROM tickets WHERE ticket_id=? LIMIT 1",
      [ticketId]
    );
    if (!row) return res.status(404).json({ success:false, message:"ticket not found" });

    let messages;
    if (row.type_message === "report" && !childOnly) {
      // ברירת מחדל: שרשור מלא (אב + כל הילדים)
      const parentId = row.parent_id;
      const [msgs] = await conn.execute(
        `SELECT m.message_id, m.ticket_id, m.sender_role, m.body, m.created_at
           FROM ticket_messages m
          WHERE m.ticket_id IN (SELECT ticket_id FROM tickets WHERE ticket_id=? OR related_ticket_id=?)
          ORDER BY m.created_at ASC`,
        [parentId, parentId]
      );
      messages = msgs;
    } else {
      // scope=self  →  רק ההודעות של הטיקט עצמו (הילד)
      const [msgs] = await conn.execute(
        `SELECT message_id, ticket_id, sender_role, body, created_at
           FROM ticket_messages
          WHERE ticket_id = ?
          ORDER BY created_at ASC`,
        [ticketId]
      );
      messages = msgs;
    }

    res.json({ success:true, messages });
  } catch (e) {
    console.error("GET /api/contacts/:ticketId/messages error:", e);
    res.status(500).json({ success:false, message:"DB error" });
  }
});


/**
 * PUT /api/contacts/:ticketId/status
 * עדכון סטטוס — מנהל בלבד
 */
router.put("/:ticketId/status", adminGuard, async (req, res) => {
  const ticketId = String(req.params.ticketId || "");
  const { status } = req.body || {};
  if (!STATUS_VALUES.has(status)) {
    return res.status(400).json({ success: false, message: "invalid status" });
  }

  try {
    const conn = await db.getConnection();
    const [r] = await conn.execute(
      "UPDATE tickets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE ticket_id = ?",
      [status, ticketId]
    );
    if (r.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "ticket not found" });
    }
    res.json({ success: true });
  } catch (e) {
    console.error("PUT /api/contacts/:ticketId/status error:", e);
    res.status(500).json({ success: false, message: "DB error" });
  }
});

/* =======================================================================
   יצירת טיקט כללי/דיווח (אורח/משתמש לא מחובר)
======================================================================= */
/*
 POST /api/contacts
 body: { type_message, product_id?, subject, email, first_name, last_name }
*/
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
  if (!TYPE_VALUES.has(type_message) || type_message === "admin_seller") {
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
    const [[{ uuid }]] = await conn.query("SELECT UUID() AS uuid");

    await conn.execute(
      `INSERT INTO tickets
        (ticket_id, type_message, product_id, subject, email, first_name, last_name, created_at, updated_at)
       VALUES
        (?, ?, NULLIF(?, ''), ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        uuid,
        type_message,
        product_id,
        subject.trim(),
        email.trim(),
        first_name.trim(),
        last_name.trim(),
      ]
    );

    return res.status(201).json({ success: true, ticket_id: uuid });
  } catch (err) {
    console.error("POST /api/contacts error:", err);
    return res.status(500).json({ success: false, message: "DB error creating ticket" });
  }
});

/* =======================================================================
   הוספת הודעה לטיקט (משתמש/מנהל)
======================================================================= */
/*
 POST /api/contacts/:ticketId/message
 body: { sender_role: 'user' | 'system', body }
*/
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

    const [[ticket]] = await conn.execute(
      "SELECT email, subject, first_name FROM tickets WHERE ticket_id = ? LIMIT 1",
      [ticketId]
    );
    if (!ticket) {
      return res.status(404).json({ success: false, message: "ticket not found" });
    }

    const [[{ uuid: messageId }]] = await conn.query("SELECT UUID() AS uuid");

    await conn.execute(
      "INSERT INTO ticket_messages (message_id, ticket_id, sender_role, body, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)",
      [messageId, ticketId, sender_role, body.trim()]
    );

    if (sender_role === "system") {
      await conn.execute(
        "UPDATE tickets SET status='read', updated_at=CURRENT_TIMESTAMP WHERE ticket_id=?",
        [ticketId]
      );
    } else {
      await conn.execute(
        "UPDATE tickets SET updated_at=CURRENT_TIMESTAMP WHERE ticket_id=?",
        [ticketId]
      );
    }

    // שליחת מייל תשובה למשתמש אם זו הודעת מערכת
    let mail = { sent: false };
    if (sender_role === "system") {
      try {
        const [lastUserRows] = await conn.execute(
          `SELECT body, created_at
             FROM ticket_messages
            WHERE ticket_id = ? AND sender_role='user'
            ORDER BY created_at DESC
            LIMIT 1`,
          [ticketId]
        );
        const lastUserMsg = lastUserRows[0];

        const mailSubject = `מענה לפנייה: ${ticket.subject}`;
        const html = `
          <div dir="rtl" style="font-family: Arial, Helvetica, sans-serif; font-size:14px;">
            <p>שלום ${esc(ticket.first_name || "")},</p>
            <p>קיבלנו את פנייתך בנושא: <strong>${esc(ticket.subject)}</strong></p>
            ${
              lastUserMsg
                ? `
                  <p style="margin-top:16px;"><strong>הודעתך:</strong></p>
                  <blockquote style="border-right:3px solid #e0e0e0;padding:8px 12px;margin:6px 0 0;">
                    ${toHtml(lastUserMsg.body)}
                  </blockquote>
                `
                : ""
            }
            <p><strong>המענה שלנו:</strong></p>
            <div style="background:#f6f7f8;border-radius:8px;padding:12px;margin:8px 0;">
              ${toHtml(body)}
            </div>
            <hr style="margin:18px 0;border:none;border-top:1px solid #eee;" />
            <p style="color:#777">מס' פנייה: ${esc(ticketId)}</p>
          </div>
        `;
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

/* =======================================================================
   יצירת טיקט "report" ממשתמש מחובר (session) + מייל אישור
======================================================================= */
/*
 POST /api/contacts/report
 body: { product_id, subject, body }
*/
router.post("/report", async (req, res) => {
  const u = req.session.user;
  if (!u || !u.email) {
    return res.status(401).json({ success: false, message: "Login required" });
  }

  const { product_id, subject, body } = req.body || {};
  const pid = String(product_id ?? "").trim();

  if (!pid) return res.status(400).json({ success: false, message: "product_id is required" });
  if (!nonEmpty(String(subject || "")) || String(subject).trim().length < 3)
    return res.status(400).json({ success: false, message: "subject is too short" });
  if (!nonEmpty(String(body || "")) || String(body).trim().length < 10)
    return res.status(400).json({ success: false, message: "body is too short (min 10 chars)" });

  try {
    const conn = await db.getConnection();

    // מזהה טיקט
    const [[{ uuid: ticketId }]] = await conn.query("SELECT UUID() AS uuid");

    // שרשור-אב לדיווחי המוצר
    const parentId = await getOrCreateReportParent(conn, pid);

    // יצירת טיקט-בן לדיווח הספציפי של המשתמש
    await conn.execute(
      `INSERT INTO tickets
         (ticket_id, type_message, product_id, subject, email, first_name, last_name, related_ticket_id, created_at, updated_at)
       VALUES
         (?, 'report', ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        ticketId,
        pid,
        String(subject).trim(),
        String(u.email).trim(),
        String(u.first_name || "").trim(),
        String(u.last_name || "").trim(),
        parentId,
      ]
    );

    // הודעה ראשונה בתוך הטיקט (מהמשתמש)
    const [[{ uuid: messageId }]] = await conn.query("SELECT UUID() AS uuid");
    await conn.execute(
      `INSERT INTO ticket_messages (message_id, ticket_id, sender_role, body, created_at)
       VALUES (?, ?, 'user', ?, CURRENT_TIMESTAMP)`,
      [messageId, ticketId, String(body).trim()]
    );

    await conn.execute(
      "UPDATE tickets SET updated_at = CURRENT_TIMESTAMP WHERE ticket_id = ?",
      [ticketId]
    );

    // מייל אישור לדווח
    let ackMail = { sent: false };
    try {
      let pName = "";
      try {
        const [pRows] = await conn.execute(
          "SELECT product_name FROM product WHERE product_id = ? LIMIT 1",
          [pid]
        );
        pName = pRows[0]?.product_name || "";
      } catch {}

      const productUrl =
        (process.env.FRONTEND_ORIGIN || "http://localhost:3000") +
        `/product/${pid}`;
      const subj = `אישור קבלת דיווח – ${pName ? `"${pName}"` : `מוצר #${pid}`}`;
      const html = `
        <div dir="rtl" style="font-family:Arial,Helvetica,sans-serif;font-size:14px;">
          <p>שלום ${esc(u.first_name || "")},</p>
          <p>תודה על פנייתך. המוצר ${pName ? `<b>${esc(pName)}</b>` : `#${pid}`} <b>עבר לבדיקה ע"י הנהלת האתר</b>.</p>
          <p><a href="${productUrl}">לצפייה במוצר</a></p>
          <hr/>
          <p style="margin:8px 0 0;">נושא הדיווח: <b>${esc(String(subject).trim())}</b></p>
          <blockquote style="border-right:3px solid #e0e0e0;padding:8px 12px;margin:6px 0 0;">
            ${toHtml(String(body).trim())}
          </blockquote>
          <p style="color:#777">מס' פנייה: ${esc(ticketId)}</p>
        </div>
      `;
      ackMail = await sendSystemMail(u.email, subj, html);
    } catch (e) {
      console.warn("ack mail failed:", e.message);
    }

    return res
      .status(201)
      .json({ success: true, ticket_id: ticketId, message_id: messageId, mail: ackMail });
  } catch (err) {
    console.error("POST /api/contacts/report error:", err);
    return res.status(500).json({ success: false, message: "DB error creating report ticket" });
  }
});

/* =======================================================================
   הודעה למוכר לגבי מוצר (נרשמת בשרשור הדיווחים) + מייל
======================================================================= */
/*
 POST /api/contacts/product/:pid/message-to-seller  (admin only)
 body: { body, related_ticket_id? }
 אם related_ticket_id סופק – נוודא שהוא שייך למוצר ונדביק לשם;
 אחרת – נרשום את ההודעה כהודעת מערכת ב"שרשור האב" של הדיווחים עבור המוצר.
 בנוסף נשלח מייל למוכר.
*/
router.post("/product/:pid/message-to-seller", adminGuard, async (req, res) => {
  const pid = String(req.params.pid || "");
  const { body, related_ticket_id } = req.body || {};

  if (!nonEmpty(body)) {
    return res.status(400).json({ success: false, message: "message body is too short" });
  }

  try {
    const conn = await db.getConnection();

    // פרטי מוצר + מוכר
    const [[p]] = await conn.execute(
      `SELECT p.product_id, p.product_name, u.email, u.first_name, u.last_name
         FROM product p
         JOIN users u ON u.id_number = p.seller_id_number
        WHERE p.product_id = ?
        LIMIT 1`,
      [pid]
    );
    if (!p) return res.status(404).json({ success: false, message: "product not found" });

    // קביעת טיקט יעד
    let targetTicketId = null;

    if (related_ticket_id) {
      const [[chk]] = await conn.execute(
        "SELECT ticket_id, product_id FROM tickets WHERE ticket_id=? LIMIT 1",
        [String(related_ticket_id)]
      );
      if (!chk) return res.status(404).json({ success: false, message: "related ticket not found" });
      if (chk.product_id && String(chk.product_id) !== String(pid)) {
        return res.status(400).json({ success: false, message: "ticket does not belong to this product" });
      }
      targetTicketId = String(related_ticket_id);
    } else {
      // נרשום בשרשור-האב של הדיווחים למוצר
      targetTicketId = await getOrCreateReportParent(conn, pid);
    }

    // הוספת הודעת מערכת
    const [[{ uuid: messageId }]] = await conn.query("SELECT UUID() AS uuid");
    await conn.execute(
      `INSERT INTO ticket_messages (message_id, ticket_id, sender_role, body, created_at)
       VALUES (?, ?, 'system', ?, CURRENT_TIMESTAMP)`,
      [messageId, targetTicketId, body.trim()]
    );
    await conn.execute(
      "UPDATE tickets SET updated_at = CURRENT_TIMESTAMP WHERE ticket_id = ?",
      [targetTicketId]
    );

    // שליחת מייל למוכר
    const productUrl =
      (process.env.FRONTEND_ORIGIN || "http://localhost:3000") +
      `/product/${p.product_id}`;
    const sellerName = `${p.first_name || ""} ${p.last_name || ""}`.trim() || "מוכר/ת";
    const html = `
      <div dir="rtl" style="font-family:Arial,Helvetica,sans-serif; font-size:14px;">
        <p>שלום ${esc(sellerName)},</p>
        <p>התקבלה הודעת מנהל בנוגע למוצר <b>#${p.product_id} – ${esc(p.product_name)}</b>.</p>
        <p><a href="${productUrl}">למעבר לדף המוצר</a></p>
        <hr/>
        <p><b>תוכן הודעת המנהל:</b></p>
        <p>${toHtml(body)}</p>
      </div>
    `;
    const mail = await sendSystemMail(p.email, `הודעת מנהל על מוצר #${p.product_id}`, html);

    return res
      .status(201)
      .json({ success: true, ticket_id: targetTicketId, message_id: messageId, mail });
  } catch (err) {
    console.error("message-to-seller error:", err);
    return res.status(500).json({ success: false, message: "server error" });
  }
});

module.exports = router;
