const express = require("express");
const router = express.Router();
const db = require("./database");

// עדכון כתובת המשתמש בעת בחירת משלוח
// עדכון כתובת המשתמש בעת בחירת משלוח
router.post("/update-address", async (req, res) => {
  const {
    product_id,
    city,
    street,
    house_number,
    apartment_number,
    zip,
  } = req.body;

  // ✅ בדיקה שכל שדות הכתובת חובה
  if (
    !product_id ||
    !city ||
    !street ||
    !house_number ||
    !apartment_number ||
    !zip
  ) {
    return res
      .status(400)
      .json({ success: false, message: "יש למלא את כל שדות הכתובת" });
  }

  try {
    const conn = await db.getConnection();

    // 🔍 שליפת ת"ז של הזוכה
    const [productRows] = await conn.query(
      "SELECT winner_id_number FROM product WHERE product_id = ?",
      [product_id]
    );

    if (productRows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "מוצר לא נמצא" });
    }

    const winnerId = productRows[0].winner_id_number;

    // 📌 עדכון כתובת בטבלת users
    await conn.query(
      `UPDATE users 
       SET city = ?, street = ?, house_number = ?, apartment_number = ?, zip = ? 
       WHERE id_number = ?`,
      [city, street, house_number, apartment_number, zip, winnerId]
    );

    // 📦 עדכון שדות כתובת בטבלת sale
    await conn.query(
      `UPDATE sale 
       SET 
         city = ?, 
         street = ?, 
         house_number = ?, 
         apartment_number = ?, 
         zip = ?, 
         country = ?
       WHERE product_id = ?`,
      [city, street, house_number, apartment_number, zip, "ישראל", product_id]
    );

    res.json({ success: true, message: "כתובת עודכנה בהצלחה" });
  } catch (err) {
    console.error("❌ שגיאה בעדכון כתובת:", err.message);
    res
      .status(500)
      .json({ success: false, message: "שגיאה בשרת בעת עדכון כתובת" });
  }
});

//שליחת כתובת מגורים קיימת לטבלת sale
// שליחת כתובת מגורים קיימת לטבלת sale
router.post("/use-saved-address", async (req, res) => {
  const { product_id } = req.body;
  console.log("product_id:", product_id);

  if (!product_id) {
    return res.status(400).json({ success: false, message: "חסר product_id" });
  }

  try {
    const conn = await db.getConnection();

    // שלב 1: שליפת ת"ז של הזוכה
    const [productRows] = await conn.query(
      "SELECT * FROM product WHERE product_id = ?",
      [product_id]
    );

    if (productRows.length === 0) {
      return res.status(404).json({ success: false, message: "מוצר לא נמצא" });
    }

    const product = productRows[0];
    const winnerId = product.winner_id_number;

    // שלב 2: שליפת כתובת מהמשתמש
    const [userRows] = await conn.query(
      "SELECT city, street, house_number, apartment_number, zip FROM users WHERE id_number = ?",
      [winnerId]
    );

    const user = userRows[0];
    if (
      !user ||
      !user.city ||
      !user.street ||
      !user.house_number ||
      !user.apartment_number ||
      !user.zip
    ) {
      return res
        .status(400)
        .json({ success: false, message: "כתובת לא מלאה בפרופיל שלך" });
    }

    // שלב 3: בדיקת קיום בטבלת sale
    const [saleRows] = await conn.query(
      "SELECT * FROM sale WHERE product_id = ?",
      [product_id]
    );

    if (saleRows.length === 0) {
      // אם אין – יוצרים רשומה בסיסית עם נתוני המוצר
      await conn.query(
        `INSERT INTO sale (product_id, product_name, final_price, end_date, buyer_id_number)
         VALUES (?, ?, ?, NOW(), ?)`,
        [product.product_id, product.product_name, product.current_price, winnerId]
      );
    }

    // שלב 4: עדכון כתובת
    await conn.query(
      `UPDATE sale 
       SET city = ?, street = ?, house_number = ?, apartment_number = ?, zip = ?, country = ?
       WHERE product_id = ?`,
      [
        user.city,
        user.street,
        user.house_number,
        user.apartment_number,
        user.zip,
        "ישראל",
        product_id,
      ]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("❌ שגיאה בשליחה אוטומטית:", err.message);
    res.status(500).json({ success: false, message: "שגיאה בשרת" });
  }
});



// עדכון שמשלוח הגיע בטבלת מכירות לקונה בלבד
router.put("/mark-delivered", async (req, res) => {
  const { product_id } = req.body;

  if (!product_id) {
    return res.status(400).json({ success: false, message: "חסר product_id" });
  }

  try {
    const conn = await db.getConnection();
    const [result] = await conn.execute(
      "UPDATE sale SET is_delivered = 1 WHERE product_id = ?",
      [product_id]
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "מוצר לא נמצא בטבלת sale" });
    }

    res.json({ success: true, message: "עודכן כבוצע בהצלחה" });
  } catch (err) {
    console.error("❌ שגיאה בעדכון is_delivered:", err);
    res.status(500).json({ success: false, message: "שגיאה בשרת" });
  }
});

// שליפת כל המכירות
router.get("/all", async (req, res) => {
  try {
    const conn = await db.getConnection();
    const [results] = await conn.query("SELECT * FROM sale");
    res.json(results);
  } catch (err) {
    console.error("❌ שגיאה בשליפת מכירות:", err.message);
    res.status(500).json({ error: "שגיאה בשליפת מכירות" });
  }
});

// שליפת כל המכירות לפי ת"ז
router.get("/user/:id_number", async (req, res) => {
  const buyerId = req.params.id_number;

  try {
    const conn = await db.getConnection();
    const [results] = await conn.execute(
      "SELECT * FROM sale WHERE buyer_id_number = ?",
      [buyerId]
    );
    res.json(results);
  } catch (err) {
    console.error("❌ שגיאה בשליפת מכירות למשתמש:", err.message);
    res.status(500).json({ error: "שגיאה בשליפת מכירות למשתמש" });
  }
});

module.exports = router;
