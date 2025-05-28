const express = require("express");
const router = express.Router();
const db = require("./database");



// עדכון כתובת המשתמש בעת בחירת משלוח
router.post("/update-address", async (req, res) => {
  const { product_id, city, street, house_number, apartment_number, zip } =
    req.body;

  // בדיקה שכל השדות החיוניים קיימים
  if (!product_id || !city || !street || !house_number || !zip) {
    return res.status(400).json({ success: false, message: "חסרים שדות חובה" });
  }

  try {
    const conn = await db.getConnection();

    // שלב 1: שליפת תעודת הזהות של הזוכה מהמוצר
    const [productRows] = await conn.query(
      "SELECT winner_id_number FROM product WHERE product_id = ?",
      [product_id]
    );

    if (productRows.length === 0) {
      return res.status(404).json({ success: false, message: "מוצר לא נמצא" });
    }

    const winnerId = productRows[0].winner_id_number;

    // שלב 2: עדכון כתובת המשתמש כולל מספר דירה
    await conn.query(
      `UPDATE users 
       SET city = ?, street = ?, house_number = ?, apartment_number = ?, zip = ? 
       WHERE id_number = ?`,
      [city, street, house_number, apartment_number || null, zip, winnerId]
    );

    res.json({ success: true, message: "כתובת עודכנה בהצלחה" });
  } catch (err) {
    console.error("❌ שגיאה בעדכון כתובת:", err.message);
    res
      .status(500)
      .json({ success: false, message: "שגיאה בשרת בעת עדכון כתובת" });
  }
});


//עדכון שמשלוח הגיע בטבלת מכירות לקונה בלבד
// עדכון is_delivered = 1 לפי product_id
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
      return res.status(404).json({ success: false, message: "מוצר לא נמצא בטבלת sale" });
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




//  שליפת כל המכירות לפי ת"ז 
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