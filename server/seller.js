const express = require("express");
const router = express.Router();
const db = require("./database");



//ניהול מוצרים של מוכר
router.get("/products", async (req, res) => {
  if (!req.session.user) {
    console.log("⚠️ אין session מחובר");
    return res.status(401).json({ message: "משתמש לא מחובר" });
  }

  const { filter } = req.query;
const sellerId = String(req.session.user.id_number);

  let query = `
SELECT p.*, 
  CASE 
  WHEN s.product_id IS NOT NULL THEN 'נמכר' 
  WHEN p.is_live = 0 THEN 'טרם התחיל' 
  WHEN p.is_live = 1 THEN 'פעיל' 
  ELSE 'לא נמכר' 
  END AS status,
  s.city, s.street, s.house_number, s.apartment_number, s.zip,
  s.notes,
  s.delivery_method,
  s.sent
  FROM product p
  LEFT JOIN sale s ON p.product_id = s.product_id
  WHERE p.seller_id_number = ?
      `;

  switch (filter) {
    //נמכר ולא נשלח לקונה
    case "sold":
      query += " AND s.product_id IS NOT NULL AND s.sent = 'no'";
      break;
    case "pending":
      query += " AND p.is_live = 0";
      break;
    case "unsold":
      query += " AND s.product_id IS NULL AND p.is_live = 1";
      break;
    case "sent":
      query += " AND s.sent = 'yes'";
      break;
    default:
      break;
  }

  try {
    const conn = await db.getConnection();
    console.log("📥 SQL QUERY:", query);
    console.log("📥 sellerId:", sellerId);
    const [products] = await conn.query(query, [sellerId]);
    res.json(products);
  } catch (error) {
    console.error("❌ שגיאה בשרת בנתיב seller/products:", error);
    res.status(500).json({ message: "שגיאה בשרת" });
  }
});



module.exports = router;
