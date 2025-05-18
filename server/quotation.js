const express = require("express");
const router = express.Router();
const db = require("./database");
const nodemailer = require("nodemailer");

// שליחת הרשמה או הצעת מחיר
router.post("/", async (req, res) => {
  const { product_id, buyer_id_number, price } = req.body;

  if (!product_id || !buyer_id_number || price === undefined) {
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

    if (price === 0) {
      const [existing] = await conn.execute(
        "SELECT * FROM quotation WHERE product_id = ? AND buyer_id_number = ?",
        [product_id, buyer_id_number]
      );

      if (existing.length > 0) {
        return res
          .status(400)
          .json({ success: false, message: "כבר נרשמת למכירה הזו" });
      }

      await conn.execute(
        "INSERT INTO quotation (product_id, buyer_id_number, price, payment_status) VALUES (?, ?, ?, 'not_completed')",
        [product_id, buyer_id_number, 0]
      );

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
            pass: "כאן אני אשים את סיסמת האפליקציה מגוגל",
          },
        });

        const mailOptions = {
          from: "BidSmart <bidsmart2025@gmail.com>",
          to: buyerEmail,
          subject: "נרשמת למכירה בהצלחה",
          text: `${product.product_name}: נרשמת בהצלחה למכירה על המוצר`,
        };

        transporter.sendMail(mailOptions, (err, info) => {
          if (err) console.error("שגיאה בשליחת מייל:", err);
          else console.log("נשלח מייל:", info.response);
        });
      }

      return res.json({ success: true, message: "נרשמת למכירה" });
    }

    if (now > endDate) {
      return res
        .status(400)
        .json({ success: false, message: "המכירה הסתיימה" });
    }

    if (price < product.price) {
      return res
        .status(400)
        .json({ success: false, message: "הצעה נמוכה ממחיר פתיחה" });
    }

    const [existingBid] = await conn.execute(
      "SELECT * FROM quotation WHERE product_id = ? AND buyer_id_number = ?",
      [product_id, buyer_id_number]
    );

    if (existingBid.length > 0) {
      await conn.execute(
        "UPDATE quotation SET price = ? WHERE product_id = ? AND buyer_id_number = ?",
        [price, product_id, buyer_id_number]
      );
    } else {
      await conn.execute(
        "INSERT INTO quotation (product_id, buyer_id_number, price, payment_status) VALUES (?, ?, ?, 'not_completed')",
        [product_id, buyer_id_number, price]
      );
    }

    res.json({ success: true, message: "ההצעה נשמרה בהצלחה" });
  } catch (err) {
    console.error("שגיאה בהוספת הצעה/הרשמה:", err);
    res.status(500).json({ success: false, message: "שגיאה בשרת" });
  }
});

// שליפת הצעות לפי product_id
router.get("/:product_id", async (req, res) => {
  const { product_id } = req.params;

  try {
    const conn = await db.getConnection();

    const [bids] = await conn.execute(
      "SELECT * FROM quotation WHERE product_id = ? ORDER BY price DESC",
      [product_id]
    );

    res.json(bids);
  } catch (err) {
    console.error("שגיאה בשליפת הצעות:", err);
    res.status(500).json({ message: "שגיאה בשרת" });
  }
});

module.exports = router;
