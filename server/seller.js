// server/seller.js
const express = require("express");
const router = express.Router();
const db = require("./database");


// מאמת שמדובר במוכר מחובר ומכניס את המספר זיהוי שלו לבקשה
function requireSeller(req, res, next) {
  const user = req.session?.user;
  if (!user) return res.status(401).json({ message: "לא מחובר" });

  // אם תרצה לאפשר לאדמין לראות של מוכר ספציפי ע"י פרמטר:
  // if (user.role === "admin" && req.query.seller_id_number) {
  //   req.sellerId = String(req.query.seller_id_number);
  //   return next();
  // }

  if (user.role !== "seller") {
    return res.status(403).json({ message: "אין הרשאה" });
  }
  req.sellerId = String(user.id_number);
  next();
}


// רשימת מוצרים של המוכר (עם פילטרים) + תמונות
// רשימת מוצרים של המוכר (עם פילטרים) + תמונות – רק של המוכר המחובר
router.get("/products", requireSeller, async (req, res) => {
  const { filter = "all" } = req.query;

  try {
    const conn = await db.getConnection();

    let where = "WHERE p.seller_id_number = ? AND p.product_status <> 'blocked'";
    const params = [req.sellerId];

    if (filter === "sold") {
      where += " AND p.product_status = 'sale' AND (s.is_delivered = 0 OR s.is_delivered IS NULL)";
    } else if (filter === "sent") {
      where += " AND p.product_status = 'sale' AND s.is_delivered = 1";
    } else if (filter === "pending") {
      where += " AND p.is_live = 0";
    } else if (filter === "unsold") {
      where += " AND p.is_live = 1 AND p.winner_id_number IS NULL";
    } else if (filter === "toShip") {
      // נמכר, שיטת משלוח = delivery, טרם נשלח
      where += `
        AND p.product_status = 'sale'
        AND LOWER(COALESCE(s.delivery_method, '')) = 'delivery'
        AND (
          s.is_delivered IS NULL OR s.is_delivered = 0
        )
        AND (
          s.sent IS NULL
          OR LOWER(s.sent) IN ('no','0')
        )
      `;
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
        s.is_delivered,
        s.delivery_method,
        s.city, s.street, s.house_number, s.apartment_number, s.zip, s.notes
      FROM product p
      LEFT JOIN sale s ON s.product_id = p.product_id
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
    console.error("שגיאה בשליפת מוצרי מוכר:", err);
    res.status(500).json({ message: "שגיאה בשרת" });
  }
});








module.exports = router;
