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

    // בסיס WHERE:
    // מנהל – הכל, אפשר לצמצם עפ"י seller_id_number; מוכר – רק שלו.
    let where = req.isAdmin ? "WHERE 1=1" : "WHERE p.seller_id_number = ?";
    const params = req.isAdmin ? [] : [String(req.sellerId)];

    if (req.isAdmin && sellerIdParam) {
      where += " AND p.seller_id_number = ?";
      params.push(sellerIdParam);
    }

    // מסננים לפי הבקשה
    switch (filterRaw) {
      case "forsale":
        // מוצרים שטרם חלה המכירה (status = for_sale)
        where += " AND LOWER(p.product_status) = 'for sale'";
        break;

      case "sold":
        // כל המוצרים שנמכרו (status = sale)
        where += " AND LOWER(p.product_status) = 'sale'";
        break;

      case "solddelivery":
        // נמכרו + משלוח
        where += `
          AND LOWER(p.product_status) = 'sale'
          AND LOWER(COALESCE(s.delivery_method, '')) = 'delivery'
        `;
        break;

      case "soldpickup":
        // נמכרו + איסוף עצמי
        where += `
          AND LOWER(p.product_status) = 'sale'
          AND LOWER(COALESCE(s.delivery_method, '')) = 'pickup'
        `;
        break;

      case "notsold":
        // מוצרים שלא נמכרו (status = Not sold → lower = 'not sold')
        where += " AND LOWER(p.product_status) = 'not sold'";
        break;

      case "blocked":
        // מוצרים חסומים על ידי (status = blocked)
        where += " AND LOWER(p.product_status) = 'blocked'";
        break;

      case "adminblocked":
        // מוצרים חסומים על ידי ההנהלה (status = admin blocked)
        where += " AND LOWER(p.product_status) = 'admin blocked'";
        break;

      case "all":
      default:
        // ללא תנאי סטטוס – מציג הכל
        break;
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

        -- נתוני מכירה/משלוח
        s.sent,
        s.is_delivered,
        s.delivery_method,
        s.city, s.street, s.house_number, s.apartment_number, s.zip, s.notes,

        -- נתוני תצוגה/אקסל
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
    if (!rows || rows.length === 0) {
      return res.json([]);
    }

    // תמונות (רק אם יש מזהים)
    const ids = rows.map(r => r.product_id);
    let withImages = rows;

    if (ids.length > 0) {
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

      withImages = rows.map(p => ({ ...p, images: imgsMap.get(p.product_id) || [] }));
    }

    res.json(withImages);
  } catch (err) {
    console.error("שגיאה בשליפת מוצרים:", err);
    res.status(500).json({ message: "שגיאה בשרת" });
  }
});

module.exports = router;