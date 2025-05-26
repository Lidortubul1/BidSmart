const db = require("./database");


const nodemailer = require("nodemailer");

async function notifyUpcomingAuctions() {
  console.log("📨 בודק מכירות שמתחילות בעוד 10 דקות...");

  try {
    const conn = await db.getConnection();

    const [products] = await conn.query(`
      SELECT * FROM product 
      WHERE is_live = 0 
        AND start_date = CURDATE()
        AND TIME(start_time) = TIME(DATE_ADD(NOW(), INTERVAL 10 MINUTE))
    `);

    for (const product of products) {
      // שליפת משתמשים שנרשמו להצעות
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

// שולח מייל התראה עם קישור לדף המכירה
async function sendEmailReminder(email, product) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "bidsmart2025@gmail.com",
      pass: "zjkkgwzmwjjtcylr", // עדיף לשים בקובץ .env בעתיד
    },
  });

  const link = `http://localhost:3000/live/${product.product_id}`;

  const mailOptions = {
    from: "BidSmart <bidsmart2025@gmail.com>",
    to: email,
    subject: `המכירה של "${product.product_name}" תתחיל בעוד כ־10 דקות!`,
    text: `המכירה של "${product.product_name}" תתחיל עוד מעט. ניתן להצטרף כבר עכשיו לקראת ההתחלה בלינק הבא:\n${link}`,
  };

  await transporter.sendMail(mailOptions);
}



// מעדכן is_live = 1 רק כשהשעה המדויקת מגיעה
async function checkIsLiveProducts() {
  console.log("🔄 בודק is_live...");

  try {
    const conn = await db.getConnection();

    const [products] = await conn.query(`
      SELECT * FROM product
      WHERE is_live = 0
        AND CONCAT(start_date, ' ', start_time) <= NOW()
    `);

    console.log("🧪 נמצאו מוצרים שהגיע זמן ההתחלה שלהם:", products.length);

    for (const product of products) {
      await conn.query("UPDATE product SET is_live = 1 WHERE product_id = ?", [
        product.product_id,
      ]);
      console.log(`✅ עודכן is_live = 1 עבור product_id ${product.product_id}`);
    }
  } catch (err) {
    console.error("❌ שגיאה בבדיקת is_live:", err.message);
  }
}


module.exports = { checkIsLiveProducts };
module.exports = { checkIsLiveProducts, notifyUpcomingAuctions };
