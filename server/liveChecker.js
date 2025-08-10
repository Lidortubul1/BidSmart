// server/liveChecker.js
const db = require("./database");
const nodemailer = require("nodemailer");
const { startAuction,endAuction } = require("./socketManager");

// שולח מייל התראה עם קישור לדף המכירה
async function sendEmailReminder(email, product) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "bidsmart2025@gmail.com",
      pass: "zjkkgwzmwjjtcylr", // מומלץ להעביר ל-ENV
    },
  });

  const link = `http://localhost:3000/live-auction/${product.product_id}`;

  const mailOptions = {
    from: "BidSmart <bidsmart2025@gmail.com>",
    to: email,
    subject: `המכירה של "${product.product_name}" תתחיל בעוד כ־10 דקות!`,
    text: `המכירה של "${product.product_name}" תתחיל עוד מעט. ניתן להצטרף כבר עכשיו בלינק הבא:\n${link}`,
  };

  await transporter.sendMail(mailOptions);
}

// התראות למכירות שמתחילות בעוד ~10 דקות


  async function notifyUpcomingAuctions() {
  console.log("📨 בודק מכירות שמתחילות בעוד 10 דקות...");

    try {
    const conn = await db.getConnection();

    const [products] = await conn.query(`
      SELECT * FROM product 
      WHERE is_live = 0 
        AND start_date BETWEEN 
          DATE_ADD(NOW(), INTERVAL 9 MINUTE) AND 
          DATE_ADD(NOW(), INTERVAL 10 MINUTE)
    `);

    for (const product of products) {
      const [quotations] = await conn.query(
        `SELECT DISTINCT u.email 
           FROM quotation q 
           JOIN users u ON q.buyer_id_number = u.id_number
          WHERE q.product_id = ?`,
        [product.product_id]
      );

      for (const { email } of quotations) {
        await sendEmailReminder(email, product);
      }
    }
  } catch (err) {
    console.error("❌ שגיאה בשליחת התראות מוקדמות:", err.message);
  }
}



// עדכון LIVE כשמגיע start_date — דרך socketManager (כולל שידור ללקוחות)
async function checkIsLiveProducts(io) {
  try {
    const conn = await db.getConnection();
    const [rows] = await conn.query(`
      SELECT product_id, start_date
      FROM product
      WHERE is_live = 0
        AND winner_id_number IS NULL
        AND start_date <= NOW()
    `);

    for (const { product_id } of rows) {
      // זה ידליק is_live = 1 *ו* ישדר "auctionStarted" לכל הלקוחות
      await startAuction(io, product_id, { force: true });
    }
  } catch (err) {
    console.error("❌ checkIsLiveProducts error:", err.message);
  }
}



// איפשהו בבוטסטראפ של השרת (למשל כל דקה)
async function closeExpiredAuctions(io) {
  const conn = await db.getConnection();
  // TIME column:
  const [rows] = await conn.query(`
    SELECT product_id
    FROM product
    WHERE winner_id_number IS NULL
      AND is_live = 1
      AND DATE_ADD(start_date, INTERVAL TIME_TO_SEC(end_time) SECOND) < NOW()
  `);
  for (const { product_id } of rows) {
    await endAuction(io, product_id);
  }
}
// setInterval(() => closeExpiredAuctions(io), 60_000);

module.exports = { checkIsLiveProducts, notifyUpcomingAuctions,closeExpiredAuctions };
