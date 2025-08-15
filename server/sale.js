const express = require("express");
const router = express.Router();
const db = require("./database");
const axios = require("axios");

// מכניס בחירת משלוח רק לטבלת sale
router.post("/update-sale-address", async (req, res) => {
const { product_id, city, street, house_number, apartment_number, zip, notes, delivery_method, phone } = req.body;


  if (!product_id || !delivery_method) {
    return res.status(400).json({
      success: false,
      message: "חובה לספק מזהה מוצר וסוג משלוח",
    });
  }
if (!phone) {
  return res.status(400).json({ success: false, message: "יש להזין טלפון ליצירת קשר" });
}
  // אם זו כתובת למשלוח - ודא שכל השדות מולאו
  if (delivery_method === "delivery") {
    if (!city || !street || !house_number || !apartment_number || !zip) {
      return res.status(400).json({
        success: false,
        message: "יש למלא את כל שדות הכתובת למשלוח",
      });
    }
  }

  try {
    const conn = await db.getConnection();

    // שליפת שם מוצר והזוכה
    const [productRows] = await conn.query(
      "SELECT product_name, winner_id_number FROM product WHERE product_id = ?",
      [product_id]
    );

    if (productRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "המוצר לא נמצא",
      });
    }

    const { product_name: productName, winner_id_number: winnerId } =
      productRows[0];

    // בדיקה אם קיימת רשומה ב-sale
    const [existingSale] = await conn.query(
      "SELECT sale_id FROM sale WHERE product_id = ?",
      [product_id]
    );

    if (existingSale.length === 0) {
      return res.status(404).json({
        success: false,
        message: "לא נמצאה רשומת מכירה לעדכון",
      });
    }

    // עדכון הרשומה הקיימת
  await conn.query(
  `UPDATE sale 
     SET city = ?, street = ?, house_number = ?, apartment_number = ?, zip = ?, country = ?, 
         delivery_method = ?, notes = ?, buyer_id_number = ?, phone = ?
   WHERE product_id = ?`,
  [
        delivery_method === "delivery" ? city : null,
        delivery_method === "delivery" ? street : null,
        delivery_method === "delivery" ? house_number : null,
        delivery_method === "delivery" ? apartment_number : null,
        delivery_method === "delivery" ? zip : null,
        delivery_method === "delivery" ? "ישראל" : null,
        delivery_method,
        notes || null,
        winnerId,
        phone,                      // 🆕
        product_id,
      ]
    );

    res.json({ success: true, message: "הפרטים עודכנו בהצלחה בטבלת sale" });
  } catch (err) {
    console.error("❌ שגיאה בטיפול בפרטי המשלוח:", err);
    res.status(500).json({
      success: false,
      message: "שגיאה בשרת",
      error: err.message,
    });
  }
});



// מעדכן את כתובת המשתמש בפרופיל
router.post("/update-user-address", async (req, res) => {
  const { product_id, city, street, house_number, apartment_number, zip, phone } = req.body;

  if (!product_id || !city || !street || !house_number || !apartment_number || !zip) {
    return res.status(400).json({ success: false, message: "יש למלא את כל שדות הכתובת" });
  }

  try {
    const conn = await db.getConnection();
    const [productRows] = await conn.query(
      "SELECT winner_id_number FROM product WHERE product_id = ?",
      [product_id]
    );
    if (productRows.length === 0) {
      return res.status(404).json({ success: false, message: "לא נמצא מוצר מתאים" });
    }
    const winnerId = productRows[0].winner_id_number;

    // אופציונלי: טיפול בטלפון רק אם סופק, כולל trim ולידציה
    let phoneToSet = null; // null => COALESCE ישאיר את המספר כפי שהוא
    if (typeof phone !== "undefined") {
      const cleaned = String(phone).trim();
      if (cleaned.length === 0) {
        phoneToSet = null; // התעלמות ממחרוזת ריקה
      } else if (/^\+9725\d\d{7}$/.test(cleaned)) {
        phoneToSet = cleaned; // תקין – נעדכן
      } else {
        return res.status(400).json({ success: false, message: "פורמט טלפון לא תקין" });
      }
    }

    await conn.query(
      `UPDATE users 
         SET city = ?, street = ?, house_number = ?, apartment_number = ?, zip = ?, 
             phone = COALESCE(?, phone)
       WHERE id_number = ?`,
      [city, street, house_number, apartment_number, zip, phoneToSet, winnerId]
    );

    res.json({ success: true, message: "כתובת נשמרה בפרופיל המשתמש" });
  } catch (err) {
    console.error("❌ שגיאה בעדכון כתובת בפרופיל:", err.message);
    res.status(500).json({ success: false, message: "שגיאה בעדכון כתובת בפרופיל" });
  }
});



//עדכון מספר טלפון בפרופיל של המשתמש אם בחר שכן
router.post("/update-user-phone", async (req, res) => {
  const { product_id, phone } = req.body;

  if (!product_id || !phone) {
    return res.status(400).json({ success: false, message: "חסר product_id או phone" });
  }

  // ולידציה: +9725X + 7 ספרות
  const isValidIlMobile = /^\+9725\d\d{7}$/.test(phone);
  if (!isValidIlMobile) {
    return res.status(400).json({ success: false, message: "פורמט טלפון לא תקין" });
  }

  try {
    const conn = await db.getConnection();

    // מאתר את הזוכה לפי המוצר
    const [productRows] = await conn.query(
      "SELECT winner_id_number FROM product WHERE product_id = ?",
      [product_id]
    );
    if (productRows.length === 0) {
      return res.status(404).json({ success: false, message: "מוצר לא נמצא" });
    }

    const winnerId = productRows[0].winner_id_number;

    // עדכון הטלפון בפרופיל המשתמש
    await conn.query("UPDATE users SET phone = ? WHERE id_number = ?", [phone, winnerId]);

    return res.json({ success: true, message: "הטלפון נשמר בפרופיל המשתמש" });
  } catch (err) {
    console.error("❌ שגיאה בעדכון טלפון:", err.message);
    return res.status(500).json({ success: false, message: "שגיאה בעדכון טלפון בפרופיל" });
  }
});




//מילוי כתובת אוטומטית בדף משלוח
router.post("/get-user-address", async (req, res) => {
  const { product_id } = req.body;
  if (!product_id) {
    return res.status(400).json({ success: false, message: "חסר product_id" });
  }

  try {
    const conn = await db.getConnection();

    const [productRows] = await conn.query(
      "SELECT winner_id_number FROM product WHERE product_id = ?",
      [product_id]
    );
    console.log("productRows", productRows[0]);
    if (productRows.length === 0) {
      return res.status(404).json({ success: false, message: "מוצר לא נמצא" });
    }

    const winnerId = productRows[0].winner_id_number;

const [userRows] = await conn.query(
  "SELECT city, street, house_number, apartment_number, zip, phone FROM users WHERE id_number = ?",
  [winnerId]
);

console.log("user id", userRows[0]);
    const user = userRows[0];

    if (
      !user?.city ||
      !user?.street ||
      !user?.house_number ||
      !user?.apartment_number ||
      !user?.zip
    ) {
console.log("לא נמצאה כתובת מגורים מלאה");
      return res.status(400).json({
        success: false,
        message: "לא נמצאה כתובת מגורים מלאה",
      });
    }

    res.json({ success: true, address: user });
  } catch (err) {
    console.error("שגיאה בקבלת כתובת:", err.message);
    res.status(500).json({ success: false, message: "שגיאה בשרת" });
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

    // שליפת פרטי המוצר
    const [productRows] = await conn.query(
      "SELECT * FROM product WHERE product_id = ?",
      [product_id]
    );

    if (productRows.length === 0) {
      return res.status(404).json({ success: false, message: "מוצר לא נמצא" });
    }

    const product = productRows[0];
    const winnerId = product.winner_id_number;

    // שליפת הכתובת מהמשתמש
    const [userRows] = await conn.query(
      `SELECT city, street, house_number, apartment_number, zip
       FROM users
       WHERE id_number = ?`,
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
      return res.status(400).json({
        success: false,
        message: "כתובת לא מלאה בפרופיל שלך",
      });
    }

    // בדיקה שיש כבר רשומת sale למוצר
    const [saleRows] = await conn.query(
      "SELECT sale_id FROM sale WHERE product_id = ?",
      [product_id]
    );

    if (saleRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "לא נמצאה רשומת מכירה לעדכון",
      });
    }

    // עדכון הכתובת ברשומת sale הקיימת
    await conn.query(
      `UPDATE sale 
       SET city = ?, 
           street = ?, 
           house_number = ?,  
           apartment_number = ?, 
           zip = ?, 
           country = ?, 
           delivery_method = 'delivery'
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
// שליפת כל המכירות כולל שם מוצר ותמונות
//  כל המכירות (לכולם)
router.get("/all", async (req, res) => {
  try {
    const conn = await db.getConnection();

    const [results] = await conn.query(`
      SELECT 
        s.*,
        p.product_name,
        p.start_date,
        GROUP_CONCAT(pi.image_url) AS image_urls
      FROM sale s
      JOIN product p ON s.product_id = p.product_id
      LEFT JOIN product_images pi ON p.product_id = pi.product_id
      GROUP BY s.product_id
    `);

    const formatted = results.map(r => ({
      ...r,
      images: r.image_urls ? r.image_urls.split(",") : [],
    }));

    res.json(formatted);
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


//שינוי שדה של מוצר ע"י המוכר לפריט שנמסר 
router.put("/mark-as-sent/:productId", async (req, res) => {
  const { productId } = req.params;
  try {
    const conn = await db.getConnection();
    await conn.query("UPDATE sale SET sent = 'yes' WHERE product_id = ?", [
      productId,
    ]);
    res.json({ message: "עודכן בהצלחה" });
  } catch (error) {
    console.error("❌ שגיאה בעדכון sent:", error);
    res.status(500).json({ message: "שגיאה בעדכון" });
  }
});




// בדיקה האם מוכר בחר משלוח או משלוח+איסוף עצמי
// routes/sale.js (או כל ראוטר מתאים)
// בדיקה האם מוכר בחר משלוח או משלוח+איסוף עצמי
router.get("/seller-delivery-options/:productId", async (req, res) => {
  try {
    const { productId } = req.params;
    const conn = await db.getConnection(); // ✨ כמו בשאר הפונקציות

    const [rows] = await conn.query(
      `SELECT 
         u.delivery_options AS option_value,
         u.city, 
         u.street, 
         u.house_number, 
         u.apartment_number, 
         u.zip, 
         u.country
       FROM product p
       JOIN users u ON u.id_number = p.seller_id_number
       WHERE p.product_id = ?`,
      [productId]
    );

    if (!rows.length) {
      return res.status(404).json({ option: "delivery", pickupAddress: null });
    }

    const r = rows[0];
    const option = r.option_value || "delivery";

    let pickupAddress = null;
    if (option === "delivery+pickup") {
      pickupAddress = {
        city: r.city || "",
        street: r.street || "",
        house_number: r.house_number || "",
        apartment_number: r.apartment_number || "",
        zip: r.zip || "",
        country: r.country || "",
      };

      // אם כל השדות ריקים – לא מחזירים כתובת
      const allEmpty = Object.values(pickupAddress).every(
        (v) => !String(v || "").trim()
      );
      if (allEmpty) pickupAddress = null;
    }

    res.json({ option, pickupAddress });
  } catch (err) {
    console.error("❌ seller-delivery-options error:", err.message);
    res.status(500).json({ option: "delivery", pickupAddress: null });
  }
});



module.exports = router;
