const express = require("express");
const router = express.Router();
const db = require("./database");
const axios = require("axios");

// מכניס כתובת רק לטבלת sale
router.post("/update-sale-address", async (req, res) => {
  const { product_id, city, street, house_number, apartment_number, zip } =
    req.body;

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
    const [productRows] = await conn.query(
      "SELECT product_name FROM product WHERE product_id = ?",
      [product_id]
    );

    if (productRows.length === 0) {
      return res.status(404).json({ success: false, message: "מוצר לא נמצא" });
    }

    const productName = productRows[0].product_name;
    const [existingSale] = await conn.query(
      "SELECT * FROM sale WHERE product_id = ?",
      [product_id]
    );

    if (existingSale.length === 0) {
      await conn.query(
        `INSERT INTO sale (product_id, product_name, city, street, house_number, apartment_number, zip, country)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          product_id,
          productName,
          city,
          street,
          house_number,
          apartment_number,
          zip,
          "ישראל",
        ]
      );
    } else {
      await conn.query(
        `UPDATE sale SET city = ?, street = ?, house_number = ?, apartment_number = ?, zip = ?, country = ? WHERE product_id = ?`,
        [city, street, house_number, apartment_number, zip, "ישראל", product_id]
      );
    }

    res.json({ success: true, message: "כתובת עודכנה בטבלת sale" });
  } catch (err) {
    console.error("❌ שגיאה בטיפול בכתובת:", err.message);
    res.status(500).json({ success: false, message: "שגיאה בשרת" });
  }
});

// מעדכן את כתובת המשתמש בפרופיל
router.post("/update-user-address", async (req, res) => {
  const { product_id, city, street, house_number, apartment_number, zip } =
    req.body;

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
    const [productRows] = await conn.query(
      "SELECT winner_id_number FROM product WHERE product_id = ?",
      [product_id]
    );

    if (productRows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "לא נמצא מוצר מתאים" });
    }

    const winnerId = productRows[0].winner_id_number;

    await conn.query(
      `UPDATE users SET city = ?, street = ?, house_number = ?, apartment_number = ?, zip = ? WHERE id_number = ?`,
      [city, street, house_number, apartment_number, zip, winnerId]
    );

    res.json({ success: true, message: "כתובת נשמרה בפרופיל המשתמש" });
  } catch (err) {
    console.error("❌ שגיאה בעדכון כתובת בפרופיל:", err.message);
    res
      .status(500)
      .json({ success: false, message: "שגיאה בעדכון כתובת בפרופיל" });
  }
});

// שליחת כתובת קיימת לטבלת sale
router.post("/use-saved-address", async (req, res) => {
  const { product_id } = req.body;
  if (!product_id) {
    return res.status(400).json({ success: false, message: "חסר product_id" });
  }

  try {
    const conn = await db.getConnection();
    const [productRows] = await conn.query(
      "SELECT * FROM product WHERE product_id = ?",
      [product_id]
    );

    if (productRows.length === 0) {
      return res.status(404).json({ success: false, message: "מוצר לא נמצא" });
    }

    const product = productRows[0];
    const winnerId = product.winner_id_number;

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

    const [saleRows] = await conn.query(
      "SELECT * FROM sale WHERE product_id = ?",
      [product_id]
    );

    if (saleRows.length === 0) {
      await conn.query(
        `INSERT INTO sale (product_id, product_name, final_price, end_date, buyer_id_number)
         VALUES (?, ?, ?, NOW(), ?)`,
        [
          product.product_id,
          product.product_name,
          product.current_price,
          winnerId,
        ]
      );
    }

    await conn.query(
      `UPDATE sale SET city = ?, street = ?, house_number = ?, apartment_number = ?, zip = ?, country = ? WHERE product_id = ?`,
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

// סימון מוצר כהתקבל
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

// שמירת סיכום הזמנה כולל פרטי משלוח והערות
router.post("/save-order-summary", async (req, res) => {
  const {
    product_id,
    full_name,
    phone,
    shipping_method,
    note,
    city,
    street,
    zip,
  } = req.body;

  if (!product_id || !full_name || !phone || !shipping_method) {
    return res
      .status(400)
      .json({ success: false, message: "שדות חסרים בטופס ההזמנה" });
  }

  if (note && note.length > 200) {
    return res
      .status(400)
      .json({ success: false, message: "הערות חורגות מהמגבלה" });
  }

  try {
    const conn = await db.getConnection();

    let query = `UPDATE sale SET phone = ?, notes = ?, shipping_method = ?, full_name = ?, `;
    const values = [phone, note || "", shipping_method, full_name];



    if (shipping_method === "shipping") {
      query += `city = ?, street = ?, zip = ?, country = 'ישראל', `;
      values.push(city, street, zip);
    }

    query += `updated_at = NOW() WHERE product_id = ?`;
    values.push(product_id);

    await conn.query(query, values);

    // קריאה לשרת התשלומים עם axios במקום fetch
    const { data } = await axios.post(
      "http://localhost:5000/api/payment/create-order",
      { product_id }
    );

    const approveUrl = data?.links?.find(
      (link) => link.rel === "approve"
    )?.href;

    if (!approveUrl) {
      return res
        .status(500)
        .json({ success: false, message: "שגיאה ביצירת תשלום" });
    }

    res.json({ success: true, paypalUrl: approveUrl });
  } catch (err) {
    console.error("❌ שגיאה בשמירת סיכום ההזמנה:", err.message);
    res.status(500).json({ success: false, message: "שגיאה בשרת" });
  }
});


module.exports = router;
