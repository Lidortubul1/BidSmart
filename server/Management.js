// server/Management.js
const express = require("express");
const router = express.Router();
const db = require("./database");

/** אימות: מוכר או מנהל */
function requireSellerOrAdmin(req, res, next) {
  const user = req.session?.user;
  if (!user) return res.status(401).json({ message: "לא מחובר" });

  if (user.role === "admin") {
    req.isAdmin = true;
    return next();
  }
  if (user.role === "seller") {
    req.isAdmin = false;
    req.sellerId = String(user.id_number);
    return next();
  }
  return res.status(403).json({ message: "אין הרשאה" });
}

/**
 * רשימת מוצרים לפי תפקיד:
 * - מוכר: רק המוצרים שלו (כמו שהיה), כברירת מחדל ללא חסומים.
 * - מנהל: כל המוצרים של כל המוכרים (כולל חסומים), עם אפשרות לצמצם ע"י ?seller_id_number=
 *
 * פילטרים (query ?filter=):
 *  all | sold | sent | pending | unsold | toShip | blocked
 *  (לא תלוי רישיות; גם "toShip" וגם "toship" יעבדו)
 */
router.get("/products", requireSellerOrAdmin, async (req, res) => {
  const filterRaw = String(req.query.filter || "all").toLowerCase();
  const sellerIdParam = req.isAdmin ? String(req.query.seller_id_number || "") : "";

  try {
    const conn = await db.getConnection();

    // בסיס WHERE: למנהל אין סינון לפי מוכר, אלא אם ביקש seller_id_number; למוכר – רק שלו.
    let where = req.isAdmin ? "WHERE 1=1" : "WHERE p.seller_id_number = ?";
    const params = req.isAdmin ? [] : [req.sellerId];

    if (req.isAdmin && sellerIdParam) {
      where += " AND p.seller_id_number = ?";
      params.push(sellerIdParam);
    }

    // פילטרים
    if (filterRaw === "blocked") {
      // רק חסומים
      where += " AND LOWER(p.product_status) = 'blocked'";
    } else {
      // מוכר: אל תציג חסומים בברירת מחדל (כמו שהיה).
      // מנהל: רואה הכל (כולל חסומים) כברירת מחדל.
      if (!req.isAdmin) {
        where += " AND LOWER(p.product_status) <> 'blocked'";
      }

      if (filterRaw === "sold") {
        where += " AND LOWER(p.product_status) = 'sale'";
      } else if (filterRaw === "sent") {
        where += " AND LOWER(p.product_status) = 'sale' AND LOWER(COALESCE(s.sent,'')) = 'yes'";
      } else if (filterRaw === "pending") {
        where += " AND p.is_live = 0";
      } else if (filterRaw === "unsold") {
        where += " AND p.is_live = 1 AND p.winner_id_number IS NULL";
      } else if (filterRaw === "toship") {
        // מיועדים לשליחה (נמכר, משלוח, טרם נשלח/נמסר)
        where += `
          AND LOWER(p.product_status) = 'sale'
          AND LOWER(COALESCE(s.delivery_method, '')) = 'delivery'
          AND (s.is_delivered IS NULL OR s.is_delivered = 0)
          AND (s.sent IS NULL OR LOWER(s.sent) IN ('no','0'))
        `;
      }
      // "all" – אין תנאי נוסף
    }

  // server/seller.js  (במסלול GET /products)
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

  -- משלוח/מכירה
  s.sent,
  s.is_delivered,
  s.delivery_method,
  s.city, s.street, s.house_number, s.apartment_number, s.zip, s.notes,

  -- מידע נוסף לתצוגה/אקסל
  p.category_id, p.subcategory_id,
  c.name  AS category_name,
  sc.name AS subcategory_name,

  u.id_number AS seller_id_number,

  u.first_name, u.last_name,
  CONCAT(u.first_name, ' ', u.last_name) AS seller_name
FROM product p
LEFT JOIN sale s           ON s.product_id = p.product_id
LEFT JOIN categories c     ON p.category_id = c.id
LEFT JOIN subcategories sc ON p.subcategory_id = sc.id
LEFT JOIN users u          ON u.id_number = p.seller_id_number
${where}
ORDER BY p.start_date DESC
`;


    const [rows] = await conn.execute(sqlProducts, params);
    if (!rows.length) return res.json([]);

    const ids = rows.map(r => r.product_id);
    const placeholders = ids.map(() => "?").join(",");
    const [imagesRows] = await conn.execute(
      `SELECT product_id, image_url
       FROM product_images
       WHERE product_id IN (${placeholders})
       ORDER BY product_id, image_id`,
      ids
    );

    const imgsMap = new Map();
    for (const r of imagesRows) {
      if (!imgsMap.has(r.product_id)) imgsMap.set(r.product_id, []);
      imgsMap.get(r.product_id).push(r.image_url);
    }

    const withImages = rows.map(p => ({ ...p, images: imgsMap.get(p.product_id) || [] }));
    res.json(withImages);
  } catch (err) {
    console.error("שגיאה בשליפת מוצרים:", err);
    res.status(500).json({ message: "שגיאה בשרת" });
  }
});

module.exports = router;
