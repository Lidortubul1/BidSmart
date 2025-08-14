// server/seller.js
const express = require("express");
const router = express.Router();
const db = require("./database");


// רשימת מוצרים של המוכר (עם פילטרים) + תמונות
// רשימת מוצרים של המוכר (עם פילטרים) + תמונות
router.get("/products", async (req, res) => {          // ← שימי לב: /products (ברבים)
  const { filter = "all" } = req.query;

  try {
    const conn = await db.getConnection();

    let where = "WHERE 1=1";
    if (filter === "sold") {
      where += " AND p.product_status = 'sale' AND (s.is_delivered = 0 OR s.is_delivered IS NULL)";
    } else if (filter === "sent") {
      where += " AND p.product_status = 'sale' AND s.is_delivered = 1";
    } else if (filter === "pending") {
      where += " AND p.is_live = 0";
    } else if (filter === "unsold") {
      where += " AND p.is_live = 1 AND p.winner_id_number IS NULL";
    }

    const sqlProducts = `
      SELECT
        p.product_id,
        p.product_name,
        p.price,
        p.current_price,
        p.start_date,
        p.description,
        p.product_status AS status,
        p.is_live,
        p.winner_id_number,
        s.sent,
        s.is_delivered              -- ← שם העמודה כפי שב-DB
      FROM product p
      LEFT JOIN sale s ON s.product_id = p.product_id
      ${where}
      ORDER BY p.start_date DESC
    `;

    const [rows] = await conn.execute(sqlProducts);

    if (rows.length === 0) {
      // ❌ אל תקראי release() — אין מתודה כזו על חיבור רגיל
      return res.json([]);
    }

    // שליפת כל התמונות למוצרים שנמצאו
    const ids = rows.map(r => r.product_id);
    const placeholders = ids.map(() => "?").join(",");
    const sqlImages = `
      SELECT product_id, image_url
      FROM product_images
      WHERE product_id IN (${placeholders})
      ORDER BY product_id, image_id       -- ← לא id
    `;
    const [imagesRows] = await conn.execute(sqlImages, ids);

    // product_id -> [image_url, ...]
    const imgsMap = new Map();
    for (const r of imagesRows) {
      if (!imgsMap.has(r.product_id)) imgsMap.set(r.product_id, []);
      imgsMap.get(r.product_id).push(r.image_url);
    }

    const withImages = rows.map(p => ({
      ...p,
      images: imgsMap.get(p.product_id) || []
    }));

    // ❌ אל תקראי release(); אם תרצי לסגור ידנית:
    // if (conn.end) await conn.end();

    res.json(withImages);
  } catch (err) {
    console.error("שגיאה בשליפת מוצרי מוכר:", err);
    res.status(500).json({ message: "שגיאה בשרת" });
  }
});

module.exports = router;

module.exports = router;


// //ניהול מוצרים של מוכר
// router.get("/products", async (req, res) => {
//   if (!req.session.user) {
//     console.log("⚠️ אין session מחובר");
//     return res.status(401).json({ message: "משתמש לא מחובר" });
//   }

//   const { filter } = req.query;
// const sellerId = String(req.session.user.id_number);

//   let query = `
// SELECT p.*, 
//   CASE 
//   WHEN s.product_id IS NOT NULL THEN 'נמכר' 
//   WHEN p.is_live = 0 THEN 'טרם התחיל' 
//   WHEN p.is_live = 1 THEN 'פעיל' 
//   ELSE 'לא נמכר' 
//   END AS status,
//   s.city, s.street, s.house_number, s.apartment_number, s.zip,
//   s.notes,
//   s.delivery_method,
//   s.sent
//   FROM product p
//   LEFT JOIN sale s ON p.product_id = s.product_id
//   WHERE p.seller_id_number = ?
//       `;

//   switch (filter) {
//     //נמכר ולא נשלח לקונה
//     case "sold":
//       query += " AND s.product_id IS NOT NULL AND s.sent = 'no'";
//       break;
//     case "pending":
//       query += " AND p.is_live = 0";
//       break;
//     case "unsold":
//       query += " AND s.product_id IS NULL AND p.is_live = 1";
//       break;
//     case "sent":
//       query += " AND s.sent = 'yes'";
//       break;
//     default:
//       break;
//   }

//   try {
//     const conn = await db.getConnection();
//     console.log("📥 SQL QUERY:", query);
//     console.log("📥 sellerId:", sellerId);
//     const [products] = await conn.query(query, [sellerId]);
//     res.json(products);
//   } catch (error) {
//     console.error("❌ שגיאה בשרת בנתיב seller/products:", error);
//     res.status(500).json({ message: "שגיאה בשרת" });
//   }
// });



module.exports = router;
