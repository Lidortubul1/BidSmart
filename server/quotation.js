const express = require("express");
const router = express.Router();
const db = require("./database");
const nodemailer = require("nodemailer");

//להוריד שדה קומפליט
// שליחת הרשמה או הצעת מחיר
router.post("/", async (req, res) => {
  const { product_id, buyer_id_number, price } = req.body;

  console.log(" קיבלנו בקשת הצעה/הרשמה:", {
    product_id,
    buyer_id_number,
    price,
  });

  if (product_id == null || buyer_id_number == null || price == null) {
    return res.status(400).json({ success: false, message: "חסרים שדות" });
  }

  try {
    const conn = await db.getConnection();

    const [products] = await conn.execute(
      "SELECT * FROM product WHERE product_id = ?",
      [product_id]
    );

    if (products.length === 0) {
      return res.status(404).json({ success: false, message: "המוצר לא נמצא" });
    }

    const product = products[0];
    const now = new Date();
    const endDate = new Date(product.end_date);

    //  הרשמה רגילה (price = 0)
    if (price === 0) {
      const [existing] = await conn.execute(
        "SELECT * FROM quotation WHERE product_id = ? AND buyer_id_number = ?",
        [product_id, buyer_id_number]
      );

      if (existing.length > 0) {
        return res.json({ success: false, message: "כבר נרשמת למכירה הזו" });
      }

      try {
        await conn.execute(
          "INSERT INTO quotation (product_id, buyer_id_number, price) VALUES (?, ?, ?)",
          [product_id, buyer_id_number, 0]
        );
        console.log(" נרשמת בהצלחה ל־quotation");
      } catch (err) {
        console.error(" שגיאה בהכנסת שורת הרשמה:", err.message);
        return res
          .status(500)
          .json({ success: false, message: "שגיאה בשמירת ההרשמה" });
      }

      const [userData] = await conn.execute(
        "SELECT email FROM users WHERE id_number = ?",
        [buyer_id_number]
      );

      if (userData.length > 0) {
        const buyerEmail = userData[0].email;

        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: "bidsmart2025@gmail.com",
            pass: "zjkkgwzmwjjtcylr",
          },
        });

        const mailOptions = {
          from: "BidSmart <bidsmart2025@gmail.com>",
          to: buyerEmail,
          subject: "נרשמת למכירה בהצלחה",
          text: `נרשמת בהצלחה למכירה על המוצר: ${product.product_name}\n ישלח קישור במייל 10 דקות לפני שמתחיל המכרז!`,
        };

        transporter.sendMail(mailOptions, (err, info) => {
          if (err) console.error(" שגיאה בשליחת מייל:", err);
          else console.log(" מייל נשלח:", info.response);
        });
      }

      return res.json({ success: true, message: "נרשמת למכירה" });
    }

    //  מכירה הסתיימה
    if (now > endDate) {
      return res
        .status(400)
        .json({ success: false, message: "המכירה הסתיימה" });
    }

    //  הצעה נמוכה ממחיר פתיחה
    if (price < product.price) {
      return res
        .status(400)
        .json({ success: false, message: "הצעה נמוכה ממחיר פתיחה" });
    }

    //  בדיקת הצעה קיימת
    const [existingBid] = await conn.execute(
      "SELECT * FROM quotation WHERE product_id = ? AND buyer_id_number = ?",
      [product_id, buyer_id_number]
    );

    if (existingBid.length > 0) {
      try {
        await conn.execute(
          `INSERT INTO quotation (product_id, buyer_id_number, price, bid_time)
           VALUES (?, ?, ?, NOW())
           ON DUPLICATE KEY UPDATE price = VALUES(price), bid_time = NOW()`,
          [product_id, buyer_id_number, price]
        );
        console.log(" הצעה עודכנה");
      } catch (err) {
        console.error(" שגיאה בעדכון הצעה:", err.message);
        return res
          .status(500)
          .json({ success: false, message: "שגיאה בעדכון הצעה" });
      }
    } else {
      try {
        await conn.execute(
          "INSERT INTO quotation (product_id, buyer_id_number, price) VALUES (?, ?, ?)",
          [product_id, buyer_id_number, price]
        );
        console.log(" הצעה חדשה נשמרה");
      } catch (err) {
        console.error(" שגיאה בהוספת הצעה:", err.message);
        return res
          .status(500)
          .json({ success: false, message: "שגיאה בשמירת ההצעה" });
      }
    }

    res.json({ success: true, message: "ההצעה נשמרה בהצלחה" });
  } catch (err) {
    console.error(" שגיאה כללית:", err.message);
    res.status(500).json({ success: false, message: "שגיאה בשרת" });
  }
});

// שליפת כל ההצעות של משתמש לפי תעודת זהות
router.get("/user/:id_number", async (req, res) => {
  const idNumber = req.params.id_number;

  try {
    const conn = await db.getConnection();

    // שליפת כל ההצעות של המשתמש כולל המידע על המוצר והתמונות
    const [results] = await conn.query(
      `SELECT q.*, p.*, 
              GROUP_CONCAT(pi.image_url) AS image_urls
       FROM quotation q
       JOIN product p ON q.product_id = p.product_id
       LEFT JOIN product_images pi ON p.product_id = pi.product_id
       WHERE q.buyer_id_number = ?
       GROUP BY p.product_id, q.quotation_id`,
      [idNumber]
    );

    // המרת מחרוזת התמונות למערך
    results.forEach((row) => {
      row.images = row.image_urls ? row.image_urls.split(",") : [];
      delete row.image_urls;
    });

    res.json(results);
  } catch (err) {
    console.error(" שגיאה בשליפת הצעות למשתמש:", err.message);
    res.status(500).json({ error: "שגיאה בשליפת הצעות למשתמש" });
  }
});

// שליפת הצעות לפי product_id
router.get("/:product_id", async (req, res) => {
  const { product_id } = req.params;

  try {
    const conn = await db.getConnection();

    const [bids] = await conn.execute(
      "SELECT * FROM quotation WHERE product_id = ? ORDER BY price DESC", //שליפה לפי מחיר מהגבוה לנמוך
      [product_id]
    );

    res.json(bids);
  } catch (err) {
    console.error("שגיאה בשליפת הצעות:", err.message);
    res.status(500).json({ message: "שגיאה בשרת" });
  }
});

// שליפת כל ההצעות
router.get("/all", async (req, res) => {
  try {
    const [results] = await db.query("SELECT * FROM quotation");
    res.json(results);
  } catch (err) {
    console.error("שגיאה בשליפת הצעות:", err);
    res.status(500).json({ error: "שגיאה בשליפת הצעות" });
  }
});

//מחיקת הצעה של משתמש לפני שהתחילה המכירה
router.delete("/:productId/:buyerId", async (req, res) => {
  const { productId, buyerId } = req.params;

  try {
    const conn = await db.getConnection();

    const [result] = await conn.execute(
      "DELETE FROM quotation WHERE product_id = ? AND buyer_id_number = ?",
      [productId, buyerId]
    );

    if (result.affectedRows > 0) {
      res.json({ success: true, message: "ההצעה נמחקה בהצלחה" });
    } else {
      res.status(404).json({ success: false, message: "ההצעה לא נמצאה" });
    }
  } catch (err) {
    console.error(" שגיאה במחיקת הצעה:", err.message);
    res.status(500).json({ success: false, message: "שגיאה בשרת" });
  }
});

module.exports = router;
