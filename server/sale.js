const express = require("express");
const router = express.Router();
const db = require("./database");
const axios = require("axios");

// מכניס בחירת משלוח רק לטבלת sale
router.post("/update-sale-address", async (req, res) => {
  const {
    product_id,
    city,
    street,
    house_number,
    apartment_number,
    zip,
    notes,
    delivery_method,
  } = req.body;

  if (!product_id || !delivery_method) {
    return res.status(400).json({
      success: false,
      message: "חובה לספק מזהה מוצר וסוג משלוח",
    });
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

    // בדיקה אם קיים כבר רשומה בטבלת sale
    const [existingSale] = await conn.query(
      "SELECT * FROM sale WHERE product_id = ?",
      [product_id]
    );

    // הערכים שיוזרקו למסד
    const values = [
      product_id,
      productName,
      winnerId,
      delivery_method === "delivery" ? city : null,
      delivery_method === "delivery" ? street : null,
      delivery_method === "delivery" ? house_number : null,
      delivery_method === "delivery" ? apartment_number : null,
      delivery_method === "delivery" ? zip : null,
      delivery_method === "delivery" ? "ישראל" : null,
      delivery_method,
      notes || null,
    ];

    console.log("📦 inserting/updating sale with values:", values);

    if (existingSale.length === 0) {
      // INSERT חדש
      await conn.query(
        `INSERT INTO sale 
         (product_id, product_name, buyer_id_number, city, street, house_number, apartment_number, zip, country, delivery_method, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        values
      );
    } else {
      // UPDATE רשומה קיימת
      await conn.query(
        `UPDATE sale 
         SET city = ?, 
             street = ?, 
             house_number = ?, 
             apartment_number = ?, 
             zip = ?, 
             country = ?, 
             delivery_method = ?, 
             notes = ?, 
             buyer_id_number = ?
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
          product_id,
        ]
      );
    }

    res.json({ success: true, message: "הפרטים עודכנו בטבלת sale" });
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

    if (productRows.length === 0) {
      return res.status(404).json({ success: false, message: "מוצר לא נמצא" });
    }

    const winnerId = productRows[0].winner_id_number;

    const [userRows] = await conn.query(
      "SELECT city, street, house_number, apartment_number, zip FROM users WHERE id_number = ?",
      [winnerId]
    );

    const user = userRows[0];

    if (
      !user?.city ||
      !user?.street ||
      !user?.house_number ||
      !user?.apartment_number ||
      !user?.zip
    ) {
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

await conn.query( `UPDATE sale SET city = ?, street = ?, house_number = ?,  apartment_number = ?, zip = ?, country = ?, delivery_method = 'delivery' WHERE product_id = ?`,
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
router.get("/all", async (req, res) => {
  try {
    const conn = await db.getConnection();

    const [results] = await conn.query(
      `SELECT s.*, p.product_name, p.start_date, p.start_time,
              GROUP_CONCAT(pi.image_url) AS image_urls
       FROM sale s
       JOIN product p ON s.product_id = p.product_id
       LEFT JOIN product_images pi ON p.product_id = pi.product_id
       GROUP BY s.product_id`
    );

    // המרה של השדה image_urls למערך
    const formattedResults = results.map((row) => ({
      ...row,
      images: row.image_urls ? row.image_urls.split(",") : [],
    }));

    res.json(formattedResults);
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
