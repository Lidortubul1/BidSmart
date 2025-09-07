//server\sendMail.js
// מודול לשליחת מיילים: יוצר חיבור עם Gmail דרך Nodemailer,
// ומספק פונקציה sendMail ששולחת הודעת טקסט לנמען עם נושא מוגדר.

const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "bidsmart2025@gmail.com",
    pass: "zjkkgwzmwjjtcylr",
  },
});

async function sendMail({ to, subject, text }) {
  await transporter.sendMail({
    from: "BidSmart <bidsmart2025@gmail.com>",
    to,
    subject,
    text,
  });
}

module.exports = sendMail;
