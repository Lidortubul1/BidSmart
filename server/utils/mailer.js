// server/utils/mailer.js
const nodemailer = require("nodemailer");

let transporter = null;

if (process.env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "").toLowerCase() === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  console.log("[mailer] mode: SMTP");
} else if (process.env.MAIL_USER && process.env.MAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS, // App Password
    },
  });
  console.log("[mailer] mode: Gmail");
} else {
  console.warn("[mailer] disabled (no SMTP / MAIL_USER)");
}

if (transporter) {
  transporter
    .verify()
    .then(() => console.log("[mailer] transporter ready"))
    .catch((e) => console.error("[mailer] verify failed:", e.message));
}

async function sendSystemMail(to, subject, html) {
  if (!transporter) return { sent: false, reason: "mailer disabled" };
  const from =
    process.env.FROM_EMAIL || process.env.MAIL_USER || "no-reply@bidsmart.local";
  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
      replyTo: from,
    });
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error("[mailer] send failed:", err.message);
    return { sent: false, reason: err.message };
  }
}

module.exports = { sendSystemMail };
