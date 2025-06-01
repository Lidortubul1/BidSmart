const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "bidsmart2025@gmail.com",
    pass: "zjkkgwzmwjjtcylr", // שימי לב שזה App Password
  },
});

transporter
  .sendMail({
    from: "BidSmart <bidsmart2025@gmail.com>",
    to: "lian.va.1995@gmail.com",
    subject: "בדיקת שליחת מייל",
    text: "שלום ליאן, זהו מייל בדיקה פשוט כדי לראות אם nodemailer עובד.",
  })
  .then(() => console.log("המייל נשלח בהצלחה! 📩"))
  .catch((err) => console.error("שגיאה בשליחת מייל:", err));
