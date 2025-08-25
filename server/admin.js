const express = require("express");
const router = express.Router();
const db = require("./database");
const multer = require("multer");

//אחסון תמונות
const storage = require("./storage");
const upload = multer({ storage });
const sendMail = require("../server/sendMail");

router.use((req, res, next) => {
  // console.log("API CALL", req.method, req.originalUrl);
  next();
});



//כמות נרשמים לפי חודש ושנה שהתקבל מהמנהל
router.get("/stats/registrations", async (req, res) => {
  const { year, month } = req.query;

  try {
    const conn = await db.getConnection();
    const [rows] = await conn.execute(
      `
      SELECT 
        DAY(registered) AS day,
        COUNT(*) AS count
      FROM users
      WHERE YEAR(registered) = ? AND MONTH(registered) = ?
      GROUP BY DAY(registered)
      ORDER BY day ASC
    `,
      [year, month]
    );

    res.json(rows); // כל רשומה היא { day: 1, count: 3 } למשל
  } catch (err) {
    console.error("שגיאה בשליפת הרשמות:", err);
    res.status(500).json({ message: "שגיאה בטעינת הנתונים" });
  }
});


//נתונים כללים של הלוח בקרה
router.get("/stats", async (req, res) => {
  const { from, to } = req.query; // אופציונלי
  try {
    const conn = await db.getConnection();

    // כשקיים טווח — נסנן לפי תאריך ה-registered של המשתמשים
    const usersWhere = (from && to) ? " AND registered BETWEEN ? AND ? " : "";
    const usersParams = (from && to) ? [from, to] : [];

    const [[{ totalSellers }]] = await conn.execute(
      `SELECT COUNT(*) AS totalSellers FROM users WHERE role = 'seller'${usersWhere}`,
      usersParams
    );

    const [[{ totalUsers }]] = await conn.execute(
      `SELECT COUNT(*) AS totalUsers FROM users WHERE role IN ('buyer','seller')${usersWhere}`,
      usersParams
    );

    const [[{ blockedUsers }]] = await conn.execute(
      `SELECT COUNT(*) AS blockedUsers FROM users WHERE status = 'blocked'${usersWhere}`,
      usersParams
    );

    // השדות הבאים לא הוגדר שנרצה לסנן לפי טווח, משאירים מצטבר:
    const [[{ deliveredSales }]] = await conn.query(
      "SELECT COUNT(*) AS deliveredSales FROM sale WHERE is_delivered = 1 AND sent = 'yes'"
    );
    const [[{ undeliveredSales }]] = await conn.query(
      "SELECT COUNT(*) AS undeliveredSales FROM sale WHERE is_delivered = 0"
    );
    const [[{ upcomingProducts }]] = await conn.query(
      "SELECT COUNT(*) AS upcomingProducts FROM product WHERE is_live = 0"
    );
    const [[{ unsoldProducts }]] = await conn.query(
      "SELECT COUNT(*) AS unsoldProducts FROM product WHERE is_live = 1 AND winner_id_number IS NULL"
    );
    const [[{ soldProducts }]] = await conn.query(
      "SELECT COUNT(*) AS soldProducts FROM product WHERE product_status = 'sale'"
    );

    res.json({
      totalSellers,
      totalUsers,
      deliveredSales,
      undeliveredSales,
      upcomingProducts,
      unsoldProducts,
      blockedUsers,
      soldProducts,
    });
  } catch (error) {
    console.error("שגיאה בקבלת סטטיסטיקות:", error);
    res.status(500).json({ error: "שגיאה בשרת" });
  }
});



//שליפת כמות מוצרים לפי קטגוריה 
router.get("/stats/products-by-category", async (req, res) => {
  try {
    const conn = await db.getConnection();
    const [rows] = await conn.execute(`
      SELECT c.name AS category, COUNT(p.product_id) AS count
      FROM product p
      JOIN categories c ON p.category_id = c.id
      GROUP BY c.name
      ORDER BY count DESC
    `);

    res.json(rows); // דוגמה: [{ category: "אלקטרוניקה", count: 5 }, ...]
  } catch (error) {
    console.error("שגיאה בשליפת מוצרים לפי קטגוריה:", error);
    res.status(500).json({ message: "שגיאה בשרת" });
  }
});

//סכום מכירות לפי חודש
router.get("/stats/sales-by-month", async (req, res) => {
  try {
    const conn = await db.getConnection();
    const [rows] = await conn.execute(`
      SELECT 
        MONTH(start_date) AS month,
        YEAR(start_date) AS year,
        SUM(current_price) AS total_sales
      FROM product
      WHERE product_status = 'sale'
      GROUP BY YEAR(start_date), MONTH(start_date)
      ORDER BY year DESC, month DESC
    `);

    res.json(rows); // דוגמה: [{ month: 8, year: 2025, total_sales: 3200 }, ...]
  } catch (err) {
    console.error("שגיאה בשליפת מכירות לפי חודש:", err);
    res.status(500).json({ message: "שגיאה בשרת" });
  }
});

//מכירות לפי טווח וקיבוץ
// /api/admin/stats/revenue?from=2025-08-01&to=2025-08-31&group=day|month
router.get("/stats/revenue", async (req, res) => {
  const { from, to, group = "month", seller_id_number } = req.query;
  try {
    const conn = await db.getConnection();

    const groupSelect =
      group === "day"
        ? "DATE(s.end_date) AS bucket"
        : "CONCAT(YEAR(s.end_date), '-', LPAD(MONTH(s.end_date),2,'0')) AS bucket";

    let sql = `
      SELECT
        ${groupSelect},
        SUM(s.final_price) AS total_sales,
        COUNT(*) AS orders_count,
        AVG(s.final_price) AS avg_order_value
      FROM sale s
      JOIN product p ON p.product_id = s.product_id
      WHERE s.end_date BETWEEN ? AND ?
    `;
    const params = [from, to];

    if (seller_id_number) {
      sql += " AND p.seller_id_number = ? ";
      params.push(seller_id_number);
    }

    sql += " GROUP BY bucket ORDER BY bucket ASC";

    const [rows] = await conn.execute(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("שגיאה בשליפת הכנסות:", err);
    res.status(500).json({ message: "שגיאה בשרת" });
  }
});

//פעילות בידים לפי טווח וקיבוץ
// /api/admin/stats/bids-activity?from=2025-08-01&to=2025-08-31&group=day|month
router.get("/stats/bids-activity", async (req, res) => {
  const { from, to, group = "day", seller_id_number } = req.query;
  try {
    const conn = await db.getConnection();

    const groupSelect =
      group === "month"
        ? "CONCAT(YEAR(q.bid_time), '-', LPAD(MONTH(q.bid_time),2,'0'))"
        : "DATE(q.bid_time)";

    let sql = `
      SELECT
        ${groupSelect} AS bucket,
        COUNT(*) AS total_bids,
        COUNT(DISTINCT q.buyer_id_number) AS unique_bidders,
        AVG(q.price) AS avg_bid_price,
        MAX(q.price) AS max_bid_price
      FROM quotation q
      JOIN product p ON p.product_id = q.product_id
      WHERE q.bid_time BETWEEN ? AND ?
    `;
    const params = [from, to];

    if (seller_id_number) {
      sql += " AND p.seller_id_number = ? ";
      params.push(seller_id_number);
    }

    sql += " GROUP BY bucket ORDER BY bucket ASC";

    const [rows] = await conn.execute(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("שגיאה בשליפת פעילות בידים:", err);
    res.status(500).json({ message: "שגיאה בשרת" });
  }
});

//מכירות לםי קטגוריה בטווח
// /api/admin/stats/sales-by-category?from=2025-08-01&to=2025-08-31
router.get("/stats/sales-by-category", async (req, res) => {
  const { from, to, seller_id_number } = req.query;
  try {
    const conn = await db.getConnection();

    let sql = `
      SELECT
        c.name AS category,
        COUNT(s.sale_id) AS sold_count,
        SUM(s.final_price) AS total_sales
      FROM sale s
      JOIN product p ON p.product_id = s.product_id
      JOIN categories c ON c.id = p.category_id
      WHERE s.end_date BETWEEN ? AND ?
    `;
    const params = [from, to];

    if (seller_id_number) {
      sql += " AND p.seller_id_number = ? ";
      params.push(seller_id_number);
    }

    sql += " GROUP BY c.name ORDER BY total_sales DESC";

    const [rows] = await conn.execute(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("שגיאה בשליפת מכירות לפי קטגוריה:", err);
    res.status(500).json({ message: "שגיאה בשרת" });
  }
});


//מוכרים מובילים בטווח
// /api/admin/stats/top-sellers?from=2025-08-01&to=2025-08-31&limit=10
router.get("/stats/top-sellers", async (req, res) => {
  const { from, to, limit = 10, seller_id_number } = req.query;
  try {
    const conn = await db.getConnection();

    let sql = `
      SELECT
        u.id_number AS seller_id_number,
        CONCAT(u.first_name, ' ', u.last_name) AS seller_name,
        COUNT(s.sale_id) AS items_sold,
        SUM(s.final_price) AS total_sales
      FROM sale s
      JOIN product p ON p.product_id = s.product_id
      LEFT JOIN users u ON u.id_number = p.seller_id_number
      WHERE s.end_date BETWEEN ? AND ?
    `;
    const params = [from, to];

    if (seller_id_number) {
      sql += " AND p.seller_id_number = ? ";
      params.push(seller_id_number);
    }

    sql += " GROUP BY u.id_number, seller_name ORDER BY total_sales DESC LIMIT ?";

    params.push(Number(limit));

    const [rows] = await conn.execute(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("שגיאה בשליפת מוכרים מובילים:", err);
    res.status(500).json({ message: "שגיאה בשרת" });
  }
});

//משפך מכירות – התחילו / נמכרו / לא נמכרו בטווח
// /api/admin/stats/auction-funnel?from=2025-08-01&to=2025-08-31
router.get("/stats/auction-funnel", async (req, res) => {
  const { from, to, seller_id_number } = req.query;
  try {
    const conn = await db.getConnection();

    let whereSeller = "";
    const params = [from, to];

    if (seller_id_number) {
      whereSeller = " AND seller_id_number = ? ";
      params.push(seller_id_number);
    }

    const [[{ started }]] = await conn.execute(
      `SELECT COUNT(*) AS started
       FROM product
       WHERE start_date BETWEEN ? AND ? ${whereSeller}`,
      params
    );

    const [[{ sold }]] = await conn.execute(
      `SELECT COUNT(*) AS sold
       FROM product
       WHERE product_status = 'sale'
         AND start_date BETWEEN ? AND ? ${whereSeller}`,
      params
    );

    const [[{ not_sold }]] = await conn.execute(
      `SELECT COUNT(*) AS not_sold
       FROM product
       WHERE product_status = 'not sold'
         AND start_date BETWEEN ? AND ? ${whereSeller}`,
      params
    );

    const conversion = started > 0 ? Math.round((sold / started) * 100) : 0;

    res.json({ started, sold, not_sold, conversion });
  } catch (err) {
    console.error("שגיאה במשפך מכירות:", err);
    res.status(500).json({ message: "שגיאה בשרת" });
  }
});


//מכירות לפי חודש
router.get("/stats/sales-by-month", async (req, res) => {
  const { from, to, seller_id_number } = req.query;
  try {
    const conn = await db.getConnection();

    let sql = `
      SELECT 
        YEAR(p.start_date) AS year,
        MONTH(p.start_date) AS month,
        SUM(p.current_price) AS total_sales
      FROM product p
      WHERE p.product_status = 'sale'
        AND p.start_date BETWEEN ? AND ?
    `;
    const params = [from, to];

    if (seller_id_number) {
      sql += " AND p.seller_id_number = ? ";
      params.push(seller_id_number);
    }

    sql += " GROUP BY YEAR(p.start_date), MONTH(p.start_date) ORDER BY year ASC, month ASC";

    const [rows] = await conn.execute(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("שגיאה בשליפת מכירות לפי חודש:", err);
    res.status(500).json({ message: "שגיאה בשרת" });
  }
});

// /api/admin/stats/registrations-range?from=YYYY-MM-DD&to=YYYY-MM-DD&group=day|month
router.get("/stats/registrations-range", async (req, res) => {
  const { from, to, group = "day" } = req.query;
  try {
    const conn = await db.getConnection();

    const groupSelect =
      group === "month"
        ? "CONCAT(YEAR(u.registered), '-', LPAD(MONTH(u.registered),2,'0'))"
        : "DATE(u.registered)";

    const [rows] = await conn.execute(
      `
      SELECT
        ${groupSelect} AS bucket,
        COUNT(*) AS count
      FROM users u
      WHERE u.registered BETWEEN ? AND ?
      GROUP BY bucket
      ORDER BY bucket ASC
      `,
      [from, to]
    );

    res.json(rows);
  } catch (err) {
    console.error("שגיאה בשליפת הרשמות בטווח:", err);
    res.status(500).json({ message: "שגיאה בשרת" });
  }
});


// /api/admin/stats/products-status-trend?from=YYYY-MM-DD&to=YYYY-MM-DD&group=day|month&seller_id_number=...
router.get("/stats/products-status-trend", async (req, res) => {
  const { from, to, group = "month", seller_id_number } = req.query;
  try {
    const conn = await db.getConnection();

    const bucketExpr =
      group === "day"
        ? "DATE(p.start_date)"
        : "CONCAT(YEAR(p.start_date), '-', LPAD(MONTH(p.start_date),2,'0'))";

    let sql = `
      SELECT
        ${bucketExpr} AS bucket,
        /* סטטוסים לפי עמודות נפרדות */
        SUM(CASE WHEN p.product_status = 'for sale' THEN 1 ELSE 0 END) AS for_sale,
        SUM(CASE WHEN p.product_status = 'sale' THEN 1 ELSE 0 END) AS sale,
        SUM(CASE WHEN LOWER(p.product_status) = 'not sold' THEN 1 ELSE 0 END) AS not_sold,
        SUM(CASE WHEN p.product_status = 'blocked' THEN 1 ELSE 0 END) AS blocked,
        COUNT(*) AS total_in_bucket
      FROM product p
      WHERE p.start_date BETWEEN ? AND ?
    `;
    const params = [from, to];

    if (seller_id_number) {
      sql += " AND p.seller_id_number = ? ";
      params.push(seller_id_number);
    }

    sql += " GROUP BY bucket ORDER BY bucket ASC";

    const [rows] = await conn.execute(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("שגיאה ב-products-status-trend:", err);
    res.status(500).json({ message: "שגיאה בשרת" });
  }
});




//ניהול משתמשים

// כל המשתמשים שהם buyer/seller עם סינון אופציונלי ע"פ role
router.get("/users", async (req, res) => {
  const { role } = req.query; // אופציונלי: "buyer" | "seller"
  try {
    const conn = await db.getConnection();
    let sql = `
      SELECT
        id, id_number, email, first_name, last_name, phone,
        role, status, registered, rating,
        country, city, street, house_number, apartment_number, zip,
        id_card_photo, profile_photo, delivery_options
      FROM users
      WHERE role IN ('buyer','seller')
    `;
    const params = [];
    if (role === "buyer" || role === "seller") {
      sql += " AND role = ? ";
      params.push(role);
    }
    sql += " ORDER BY registered DESC";
    const [rows] = await conn.execute(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("שגיאה בשליפת משתמשים:", err);
    res.status(500).json({ message: "שגיאה בשרת" });
  }
});

// פרטי משתמש בודד
router.get("/users/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const conn = await db.getConnection();
    const [rows] = await conn.execute(
      `
      SELECT
        id, id_number, email, first_name, last_name, phone,
        role, status, registered, rating,
        country, city, street, house_number, apartment_number, zip,
        id_card_photo, profile_photo, delivery_options
      FROM users
      WHERE id = ? AND role IN ('buyer','seller')
      `,
      [id]
    );
    if (!rows.length) return res.status(404).json({ message: "לא נמצא משתמש" });
    res.json(rows[0]);
  } catch (err) {
    console.error("שגיאה בשליפת משתמש:", err);
    res.status(500).json({ message: "שגיאה בשרת" });
  }
});


// עדכון סטטוס משתמש-חסום/לא חסום
router.put("/users/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const conn = await db.getConnection();
    const [result] = await conn.query("UPDATE users SET status = ? WHERE id = ?",[status, id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "משתמש לא נמצא" });
    }
    res.json({ message: "סטטוס עודכן בהצלחה" });
  } catch (error) {
    console.error("שגיאה בעדכון סטטוס:", error);
    res.status(500).json({ error: "שגיאה בשרת" });
  }
});



















//פונקציה למחיקת משתמש לצמיתות ע"י המנהל
// שים לב - עכשיו id (ולא email)
router.delete("/users/:id", async (req, res) => {
    console.log("קיבלתי מחיקת משתמש id=", req.params.id);
  try {
    const { id } = req.params;
    const conn = await db.getConnection(); 
    const [result] = await conn.query("DELETE FROM users WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "משתמש לא נמצא" });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "שגיאה במחיקת המשתמש" });
  }
});

// שליפת כל המשתמשים (ללא סיסמה)
router.get("/users", async (req, res) => {
  try {
    const conn = await db.getConnection();
    const [rows] = await conn.query(
      `SELECT 
        id,
        id_number, 
        first_name, 
        last_name, 
        email, 
        role, 
        status, 
        id_number, 
        registered, 
        phone, 
        zip, 
        city, 
        street, 
        house_number, 
        apartment_number, 
        profile_photo,
        rating    
      FROM users`
    );

    res.json(rows);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: "שגיאה בשליפת משתמשים" });
  }
});



//עריכת משתמש ע"י המנהל מערכת
router.put("/users/:id", async (req, res) => {
  const { id } = req.params;
 

  const {
    first_name,
    last_name,
    phone,
    role,
    profile_photo,
    rating,
    country,
    zip,
    city,
    street,
    house_number,
    apartment_number,
  } = req.body;

  try {
    const conn = await db.getConnection();
    const [result] = await conn.query(
      `UPDATE users SET
        first_name = ?,
        last_name = ?,
        phone = ?,
        role = ?,
        profile_photo = ?,
        rating = ?,
        country = ?,
        zip = ?,
        city = ?,
        street = ?,
        house_number = ?,
        apartment_number = ?
      WHERE id = ?`,
      [
        first_name,
        last_name,
        phone,
        role,
        profile_photo,
        rating,
        country,
        zip,
        city,
        street,
        house_number,
        apartment_number,
        id, // לא email!
      ]
    );

    res.json({ message: "המשתמש עודכן בהצלחה" });
  } catch (error) {
    console.error("שגיאה בעדכון משתמש:", error);
    res.status(500).json({ error: "שגיאה בשרת" });
  }
});















//ניהול קטגוריות

// הוספת קטגוריה
router.post("/category", async (req, res) => {
  const { name } = req.body;
  const conn = await db.getConnection();
  const [result] = await conn.execute("INSERT INTO categories (name) VALUES (?)", [name]);
  res.json({ id: result.insertId, name });
});
// הוספת תת-קטגוריה
router.post("/category/subcategory", async (req, res) => {
  const { name, category_id } = req.body;
  if (!name || !category_id) return res.status(400).json({ error: "חובה להזין שם ותעודת קטגוריה" });
  const conn = await db.getConnection();
  await conn.query(
    "INSERT INTO subcategories (name, category_id) VALUES (?, ?)",
    [name, category_id]
  );
  res.json({ success: true });
});
// מחיקת קטגוריה + העברת מוצרים ל"אחר"/"כללי"
router.delete("/category/:id", async (req, res) => {
  const categoryIdToDelete = req.params.id;

  const conn = await db.getConnection();
  await conn.beginTransaction();

  try {
    // 1. קבל id של קטגוריה 'אחר'
    const [otherCategoryRows] = await conn.execute(
      "SELECT id FROM categories WHERE name = ? LIMIT 1",
      ["אחר"]
    );
    if (otherCategoryRows.length === 0)
      throw new Error('קטגוריה "אחר" לא קיימת!');
    const otherCategoryId = otherCategoryRows[0].id;

    // 2. קבל id של תת קטגוריה "כללי" תחת "אחר"
    const [generalSubRows] = await conn.execute(
      "SELECT id FROM subcategories WHERE name = ? AND category_id = ? LIMIT 1",
      ["כללי", otherCategoryId]
    );
    if (generalSubRows.length === 0)
      throw new Error('תת קטגוריה "כללי" לא קיימת ב"אחר"!');
    const generalSubId = generalSubRows[0].id;

    // 3. אסוף את כל תתי־הקטגוריות של הקטגוריה שמוחקים
    const [subsRows] = await conn.execute(
      "SELECT id FROM subcategories WHERE category_id = ?",
      [categoryIdToDelete]
    );
    const subIds = subsRows.map((row) => row.id);

    // 4. עדכן מוצרים שנמצאים באותה קטגוריה (כולל בלי תת קטגוריה)
    await conn.execute(
      "UPDATE product SET category_id = ?, subcategory_id = ? WHERE category_id = ?",
      [otherCategoryId, generalSubId, categoryIdToDelete]
    );

    // 5. אם יש תתי קטגוריה, עדכן גם את כל המוצרים שהיו שייכים לתתי הקטגוריות (ליתר ביטחון)
    if (subIds.length > 0) {
      await conn.execute(
        `UPDATE product SET category_id = ?, subcategory_id = ? WHERE subcategory_id IN (${subIds
          .map(() => "?")
          .join(",")})`,
        [otherCategoryId, generalSubId, ...subIds]
      );
    }

    // 6. מחק את כל תתי־הקטגוריות של הקטגוריה
    await conn.execute("DELETE FROM subcategories WHERE category_id = ?", [
      categoryIdToDelete,
    ]);

    // 7. מחק את הקטגוריה עצמה
    await conn.execute("DELETE FROM categories WHERE id = ?", [
      categoryIdToDelete,
    ]);

    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: err.message });
  }
});
// מחיקת תת-קטגוריה
// מחיקת תת-קטגוריה ומעבר כל המוצרים ל"אחר"
router.delete("/category/subcategory/:id", async (req, res) => {
  const { id } = req.params;
  const conn = await db.getConnection();
console.log(id);
  try {
    // שלב 1: הבאת ה־category_id של התת־קטגוריה שמוחקים
    const [subRows] = await conn.query(
      "SELECT category_id FROM subcategories WHERE id = ?",
      [id]
    );
    if (subRows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "תת-קטגוריה לא נמצאה" });
    }
    const categoryId = subRows[0].category_id;

    // שלב 2: חפש את ה־id של תת־קטגוריה בשם "אחר" תחת אותה קטגוריה
    const [otherRows] = await conn.query(
      "SELECT id FROM subcategories WHERE category_id = ? AND name = 'אחר' LIMIT 1",
      [categoryId]
    );
    if (otherRows.length === 0) {
      return res
        .status(400)
        .json({
          success: false,
          message: "לא קיימת תת־קטגוריה 'אחר' בקטגוריה זו",
        });
    }
    const otherSubId = otherRows[0].id;

    // שלב 3: עדכן את כל המוצרים באותה תת־קטגוריה שיצביעו ל־"אחר"
    await conn.query(
      "UPDATE product SET subcategory_id = ? WHERE subcategory_id = ?",
      [otherSubId, id]
    );

    // שלב 4: מחק את תת־הקטגוריה ואם קיימים מוצרים נעביר את זה לקטגוריה אחר
    await conn.query("DELETE FROM subcategories WHERE id = ?", [id]);

    res.json({ success: true });
  } catch (err) {
    console.error("שגיאה במחיקת תת-קטגוריה:", err);
    res.status(500).json({ success: false, message: "שגיאה בשרת" });
  }
});
// שליפת כל הקטגוריות
router.get("/category", async (req, res) => {
  const conn = await db.getConnection();
  const [rows] = await conn.query("SELECT * FROM categories");
  res.json(rows);
});
// שליפת תתי-קטגוריות לקטגוריה מסוימת
router.get("/category/:id/subcategories", async (req, res) => {
  const { id } = req.params;
  const conn = await db.getConnection();
  const [rows] = await conn.query(
    "SELECT * FROM subcategories WHERE category_id = ?", [id]
  );
  res.json(rows);
});










//ניהול מוצרים

// פונקציה לשליפת מוצר אחד
router.get("/product/:id", async (req, res) => {
  try {
    const conn = await db.getConnection();

    const [products] = await conn.execute(
      "SELECT * FROM product"
    );

    //  הוספת תמונות לכל מוצר
    for (const product of products) {
      const [images] = await conn.execute(
        "SELECT image_url FROM product_images WHERE product_id = ?",
        [product.product_id]
      );
      product.images = images.map((img) => img.image_url); // מוסיף product.images
    }

    res.json(products); //  כאן מחזיר את כל המוצרים ללקוח
  } catch (e) {
    console.error("שגיאה בקבלת מוצרים:", e);
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

// שליפת כל המוצרים למנהל
// שליפת כל המוצרים עם תמונה ראשית, קטגוריה, תת-קטגוריה ומוכר
router.get("/products", async (req, res) => {
  const conn = await db.getConnection();
  try {
    // שליפת כל המוצרים עם כל השדות המרכזיים
    const [products] = await conn.query(`
      SELECT 
        p.product_id,
        p.product_name,
        p.current_price,
        p.product_status,
        p.is_live,
        p.start_date,
        p.end_date,
        p.winner_id_number,
        c.name AS category_name,
        s.name AS subcategory_name,
        u.first_name,
        u.last_name,
        u.id_number AS seller_id_number
      FROM product p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN subcategories s ON p.subcategory_id = s.id
      LEFT JOIN users u ON p.seller_id_number = u.id_number
      ORDER BY p.product_id DESC
    `);

    // שליפת כל התמונות לכל המוצרים במכה אחת
    const [allImages] = await conn.query(`
      SELECT product_id, image_url FROM product_images
    `);

    // בונה לכל מוצר את מערך התמונות שלו
    const enriched = products.map((p) => ({
      ...p,
      seller_name: [p.first_name, p.last_name].filter(Boolean).join(" "),
      images: allImages
        .filter((img) => img.product_id === p.product_id)
        .map((img) => img.image_url),
    }));

    res.json(enriched);
    console.log("המוצרים נשלפו בהצלחה, כמות:", enriched.length);
  } catch (err) {
    console.error("שגיאה בשליפת מוצרים:", err);
    res.status(500).json({ success: false, message: "שגיאה בשליפת מוצרים" });
  }
});


//נתונים כללים של מוצר
router.get("/product/:id", async (req, res) => {
  const { id } = req.params;
  const conn = await db.getConnection();
  try {
    const [rows] = await conn.query(
      `
      SELECT 
        p.*, 
        c.name AS category_name, 
        s.name AS subcategory_name, 
        u.first_name, 
        u.last_name,
        u.id_number AS seller_id_number
      FROM product p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN subcategories s ON p.subcategory_id = s.id
      LEFT JOIN users u ON p.seller_id_number = u.id_number
      WHERE p.product_id = ?
      LIMIT 1
    `,
      [id]
    );

    if (!rows.length) return res.status(404).json({ error: "מוצר לא נמצא" });

    const product = rows[0];
    // שליפת התמונות עם image_url ו-image_id
    const [images] = await conn.query(
      "SELECT image_url, image_id FROM product_images WHERE product_id = ?",
      [id]
    );
    product.images = images;
    product.seller_name = [product.first_name, product.last_name]
      .filter(Boolean)
      .join(" ");

    res.json(product);
  } catch (err) {
    console.error("שגיאה בשליפת מוצר:", err);
    res.status(500).json({ error: "שגיאה בשרת" });
  }
});


// מחיקת מוצר
router.delete("/product/:id", async (req, res) => {
  const productId = req.params.id;
  const conn = await db.getConnection();
  await conn.beginTransaction();
  try {
    // מחיקת התמונות של המוצר
    await conn.query("DELETE FROM product_images WHERE product_id = ?", [
      productId,
    ]);
    // מחיקת המוצר עצמו
    await conn.query("DELETE FROM product WHERE product_id = ?", [productId]);
    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    console.error("שגיאה במחיקת מוצר:", err);
    res.status(500).json({ success: false, message: "שגיאה במחיקת מוצר" });
  }
});

// עדכון מוצר (דוגמה – עדכן שדות עיקריים)
router.put("/product/:id", async (req, res) => {
  const productId = req.params.id;
  const {
    product_name,
    price,
    current_price,
    category_id,
    subcategory_id,
    product_status,
    description,
    is_live,
    start_date,  // מגיע בתצורה "YYYY-MM-DDTHH:MM"
    end_date,
  } = req.body;

  // נרמול ל-MySQL (רווח במקום T + שניות)
  const normalizedStart =
    start_date ? start_date.replace("T", " ") + ":00" : null;

  const conn = await db.getConnection();
  try {
    await conn.query(
      `UPDATE product SET 
        product_name   = COALESCE(?, product_name),
        price          = COALESCE(?, price),
        current_price  = COALESCE(?, current_price),
        category_id    = COALESCE(?, category_id),
        subcategory_id = COALESCE(?, subcategory_id),
        product_status = COALESCE(?, product_status),
        description    = COALESCE(?, description),
        is_live        = COALESCE(?, is_live),
        start_date     = COALESCE(?, start_date),
        end_date       = COALESCE(?, end_date)
      WHERE product_id = ?`,
      [
        product_name,
        price,
        current_price,
        category_id,
        subcategory_id,
        product_status,
        description,
        is_live,
        normalizedStart,
        end_date,
        productId,
      ]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("שגיאה בעדכון מוצר:", err);
    res.status(500).json({ success: false, message: "שגיאה בעדכון מוצר" });
  }
});


// מחיקת תמונה של מוצר ע"י המנהל
router.delete("/product/:id/image", async (req, res) => {
  const { id } = req.params;
  const { image_url } = req.body;
  const conn = await db.getConnection();
  try {
    await conn.query("DELETE FROM product_images WHERE product_id = ? AND image_url = ?", [id, image_url]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "שגיאה במחיקת תמונה" });
  }
});
// הוספת תמונה למוצר
router.post("/product/:id/image", upload.single("image"), async (req, res) => {
  const { id } = req.params;
  if (!req.file) return res.status(400).json({ error: "לא נשלחה תמונה" });
  const image_url = "/uploads/" + req.file.filename;
  const conn = await db.getConnection();
  await conn.query(
    "INSERT INTO product_images (product_id, image_url) VALUES (?, ?)",
    [id, image_url]
  );
  res.json({ success: true, image_url });
});















//ניהול פניות משתמשים

// קבלת כל הפניות
router.get("/messages", async (req, res) => {
  try {
    const conn = await db.getConnection();
    const [rows] = await conn.execute(`
      SELECT 
        cm.*,
        u.id_number AS user_id_number,
        u.status AS user_status
      FROM contact_messages cm
      LEFT JOIN users u ON cm.user_id = u.id
      ORDER BY cm.created_at DESC
    `);

    res.json(rows);
  } catch (error) {
    console.error("Error loading contact messages:", error);
    res.status(500).json({ message: "שגיאה בטעינת פניות" });
  }
});
//הודעה שמנהל שולח למשתמש 
router.post("/messages", async (req, res) => {
  const {
    email,
    subject,
    message,
    status = "new",
    admin_reply = "",
    is_admin_message = 1,
    sender_role = "admin",
  } = req.body;

let reply_sent = 0;
let messageStatus = status;

  if (!email || !subject || !message) {
    return res.status(400).json({ message: "חובה למלא אימייל, נושא והודעה" });
  }

  try {
    const conn = await db.getConnection();

    // בדיקה אם המשתמש קיים בטבלת users
    let userId = null;
    let sendEmail = false;

    const [userRows] = await conn.execute(
      "SELECT id, status FROM users WHERE email = ?",
      [email]
    );

    if (userRows.length > 0) {
      userId = userRows[0].id;
      const userStatus = userRows[0].status;

      if (userStatus === "blocked" ) {
        sendEmail = true; // שלח מייל גם אם חסום
        reply_sent =1;
        messageStatus = "resolved";
      }
    }
     else {
      sendEmail = true; // לא קיים בכלל – שלח מייל
      reply_sent = 1;
      messageStatus = "resolved";
    }

    // הכנסת ההודעה למסד הנתונים
    const [result] = await conn.execute(
      `INSERT INTO contact_messages 
        (user_id, email, subject, message, status, reply_sent, admin_reply, created_at, is_admin_message, sender_role) 
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)`,
      [
        userId,
        email,
        subject,
        message,
        messageStatus,
        reply_sent,
        admin_reply,
        is_admin_message,
        sender_role,
      ]
    );

    // שליחת מייל במידת הצורך
    if (sendEmail && message&&subject) {
      console.log("⬅ נכנס לשליחת מייל לאורח:", email);
      await sendMail({
        to: email,
        subject: subject,
        text: `:נושא\n${subject}\n\n:תשובת הנהלת האתר\n${message}`,
      });
      console.log("המייל נשלח ל:", email);
    }

    const newMessage = {
      id: result.insertId,
      user_id: userId,
      email,
      subject,
      message,
      status,
      reply_sent,
      admin_reply,
      is_admin_message,
      sender_role,
      created_at: new Date(),
    };

    res.status(201).json(newMessage);
  } catch (err) {
    console.error("שגיאה ביצירת הודעה חדשה:", err);
    res.status(500).json({ message: "שגיאה בשרת" });
  }
});
//מנהל עונה למשתמש על פנייה קיימת-אם זה אורח התשובה נשלחת למייל שכתב ואם זה משתמש אז להודעות של המשתמש
// מנהל עונה למשתמש על פנייה קיימת
router.put("/messages/:id", async (req, res) => {
  const id = req.params.id;
  const {
    email,
    subject,
    message,
    status,
    admin_reply,
    reply_sent,
    is_admin_message,
    sender_role,
  } = req.body;

  try {
    const conn = await db.getConnection();

    // שליפת שורת ההודעה עם סטטוס המשתמש
    const [rows] = await conn.execute(
      `SELECT cm.user_id, cm.email, cm.admin_reply, u.status AS user_status
       FROM contact_messages cm
       LEFT JOIN users u ON cm.user_id = u.id
       WHERE cm.id = ?`,
      [id]
    );

    const recipient = rows[0];

    console.log("Recipient:", recipient, status);
    // שלח מייל אם:
    const shouldSendEmailNew =
      status === "new" &&
      recipient &&
      admin_reply &&
      (recipient.user_id === null || recipient.user_status === "blocked");

    const shouldSendEmailProgg =
      status === "in_progress" &&
      recipient &&
      admin_reply &&
      (recipient.user_id === null || recipient.user_status === "blocked");

    console.log(admin_reply !== recipient.admin_reply);
    console.log(admin_reply, " -", recipient.admin_reply);

    if (shouldSendEmailNew) {
      console.log("⬅ שליחת מייל ראשון וחדש:", recipient.email);
      await sendMail({
        to: recipient.email,
        subject: subject,
        text: `הודעתך התקבלה:\n${message}\n\nתשובת הנהלת האתר:\n${admin_reply}`,
      });

      //לעשות שאם ההודעה שונה זה ישלח אם לא זה לא
    } else if (
      shouldSendEmailProgg &&
      admin_reply?.trim() !== recipient.admin_reply?.trim()
    ) {
      console.log("⬅ שליחת מייל שכבר נענתה- שנמצא בטיפול:", recipient.email);
      console.log(admin_reply !== recipient.admin_reply);
      console.log(admin_reply, " -", recipient.admin_reply);

      await sendMail({
        to: recipient.email,
        subject: subject,
        text: `בהמשך  לשאלתך: \n${message}\n\nתשובת הנהלת האתר היא: \n${admin_reply}`,
      });
    }

    // עדכון הפנייה
    const updateFields = [
      email,
      subject,
      message,
      status,
      admin_reply,
      reply_sent,
      sender_role,
      id,
    ];

    let updateQuery = `
      UPDATE contact_messages
      SET email = ?, subject = ?, message = ?, status = ?, admin_reply = ?, reply_sent = ?, sender_role = ?
      WHERE id = ?`;

    if (sender_role !== "user") {
      updateQuery = `
        UPDATE contact_messages
        SET email = ?, subject = ?, message = ?, status = ?, admin_reply = ?, reply_sent = ?, is_admin_message = ?, sender_role = ?
        WHERE id = ?`;
      updateFields.splice(7, 0, is_admin_message);
    }

    await conn.execute(updateQuery, updateFields);

    console.log("הודעה עודכנה בהצלחה");
    res.json({ message: "עודכן בהצלחה" });
  } catch (err) {
    console.error("שגיאה בעדכון הודעה:", err);
    res.status(500).json({ message: "שגיאת שרת" });
  }
});
//שליפת כל מיילים של המשתמשים
router.get("/messages/user-emails", async (req, res) => {
  try {
    const conn = await db.getConnection();
    const [rows] = await conn.execute("SELECT email FROM users");
    const emails = rows.map((row) => row.email);
    res.json(emails);
  } catch (err) {
    console.error("שגיאה בשליפת מיילים:", err);
    res.status(500).json({ message: "שגיאה בשרת" });
  }
});
// מחיקת הודעה לפי ID
router.delete("/messages/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const conn = await db.getConnection();

    const [result] = await conn.execute(
      "DELETE FROM contact_messages WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "ההודעה לא נמצאה" });
    }

    res.json({ message: "ההודעה נמחקה בהצלחה" });
  } catch (err) {
    console.error("שגיאה במחיקת ההודעה:", err);
    res.status(500).json({ message: "שגיאה בשרת בעת המחיקה" });
  }
});





module.exports = router;
