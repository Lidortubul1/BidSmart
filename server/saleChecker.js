//server\saleChecker.js
// בדיקת מכירות שלא שולמו: קידום הזוכה למקום 2/3 ועדכון/התראה במייל לזוכה או למוכר

const db = require("./database");
const nodemailer = require("nodemailer");

async function checkUnpaidWinners() {
  console.log(" בודק תשלומים שלא בוצעו...");

  try {
    const conn = await db.getConnection();

    // שליפת מכירות שטרם שולם עבורן
    const [sales] = await conn.query(
      `SELECT s.*, p.product_name, p.last_bid_time, 
              p.winner_id_number, p.second_place_id, 
              p.third_place_id, p.seller_id_number
       FROM sale s
       JOIN product p ON s.product_id = p.product_id
       WHERE s.payment_status = 'not_paid' AND p.is_live = 0`
    );

    const now = new Date();

    for (const sale of sales) {
      const timeDiff = now - new Date(sale.last_bid_time);
      const hoursPassed = timeDiff / (1000 * 60 * 60);

      // עברו פחות מ־24 שעות → עדיין לא מחליפים זוכה
      if (hoursPassed < 24) continue;

      // 1. אם הזוכה הוא הזוכה הראשון
      if (
        sale.winner_id_number === sale.second_place_id &&
        sale.third_place_id
      ) {
        // מקום שני לא שילם → מעבירים למקום שלישי
        await promoteWinner(conn, sale, sale.third_place_id);
      } else if (sale.winner_id_number === sale.third_place_id) {
        // גם מקום שלישי לא שילם → שולחים למוכר
        await notifySeller(conn, sale);
      } else if (sale.second_place_id) {
        // זוכה ראשון לא שילם → מעבירים למקום שני
        await promoteWinner(conn, sale, sale.second_place_id);
      }
    }
  } catch (err) {
    console.error(" שגיאה בבדיקת תשלומים:", err);
  }
}

async function promoteWinner(conn, sale, newWinnerId) {
  console.log(
    ` מעבירים זכייה ל־${newWinnerId} עבור product_id ${sale.product_id}`
  );

  await conn.query(
    `UPDATE product SET winner_id_number = ?, last_bid_time = NOW() 
     WHERE product_id = ?`,
    [newWinnerId, sale.product_id]
  );

  await sendEmail(
    newWinnerId,
    `זכית במוצר "${sale.product_name}"! כנס ובצע תשלום תוך 24 שעות.`
  );
}

async function notifySeller(conn, sale) {
  console.log(
    ` אף אחד לא שילם עבור product_id ${sale.product_id}, שולחים למוכר`
  );

  await sendEmail(
    sale.seller_id_number,
    `לא התקבל תשלום על "${sale.product_name}". צור קשר עם התמיכה.`
  );
}

async function sendEmail(idNumber, message) {
  const [users] = await db.query(
    "SELECT email FROM users WHERE id_number = ?",
    [idNumber]
  );
  if (!users.length) return;

  const email = users[0].email;
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "bidsmart2025@gmail.com",
      pass: "zjkkgwzmwjjtcylr",
    },
  });

  const mailOptions = {
    from: "BidSmart <bidsmart2025@gmail.com>",
    to: email,
    subject: "עדכון מכירה",
    text: message,
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) console.error(" שגיאה בשליחת מייל:", err.message);
    else console.log(" מייל נשלח ל:", email);
  });
}

module.exports = { checkUnpaidWinners };
