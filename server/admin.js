//server\admin.js
// ממשק ניהול: סטטיסטיקות, ניהול משתמשים (חסימה/שחרור עם טיפול במוצרים/הרשמות ומיילים), שליפת מוצרים למוכר, וניהול קטגוריות (הוספה/מחיקה עם העברת מוצרים)

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

//סטטיסטיקות מנהל





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
router.get("/stats/revenue", async (req, res) => {
  const { from, to, group = "month", seller_id_number } = req.query;
  try {
    const conn = await db.getConnection();

    // זמן הסיום בפועל של כל מכירה: start_date + end_time (TIME)
    const endAtExpr = "ADDTIME(p.start_date, COALESCE(p.end_time, '00:00:00'))";

    // קיבוץ לפי יום/חודש, על בסיס זמן הסיום המחושב
    const groupSelect =
      group === "day"
        ? `DATE(${endAtExpr}) AS bucket`
        : `CONCAT(YEAR(${endAtExpr}), '-', LPAD(MONTH(${endAtExpr}), 2, '0')) AS bucket`;

    let sql = `
      SELECT
        ${groupSelect},
        SUM(s.final_price) AS total_sales,
        COUNT(*)          AS orders_count,
        AVG(s.final_price) AS avg_order_value
      FROM sale s
      JOIN product p ON p.product_id = s.product_id
      WHERE DATE(${endAtExpr}) BETWEEN ? AND ?
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

//מכירות לםי קטגוריה בטווח
router.get("/stats/sales-by-category", async (req, res) => {
  const { from, to, seller_id_number } = req.query;
  try {
    const conn = await db.getConnection();

    const endAtExpr = "ADDTIME(p.start_date, COALESCE(p.end_time, '00:00:00'))";

    let sql = `
      SELECT
        c.name AS category,
        COUNT(s.sale_id)  AS sold_count,
        SUM(s.final_price) AS total_sales
      FROM sale s
      JOIN product p ON p.product_id = s.product_id
      JOIN categories c ON c.id = p.category_id
      WHERE ${endAtExpr} BETWEEN ? AND ?
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

    // זמן הסיום בפועל של המכרז: start_date + end_time (TIME)
    const endAtExpr = "ADDTIME(p.start_date, COALESCE(p.end_time, '00:00:00'))";

    let sql = `
      SELECT
        u.id_number AS seller_id_number,
        CONCAT(u.first_name, ' ', u.last_name) AS seller_name,
        COUNT(s.sale_id)   AS items_sold,
        SUM(s.final_price) AS total_sales
      FROM sale s
      JOIN product p ON p.product_id = s.product_id
      LEFT JOIN users u ON u.id_number = p.seller_id_number
      WHERE DATE(${endAtExpr}) BETWEEN ? AND ?
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

const [[{ not_started }]] = await conn.execute(
  `SELECT COUNT(*) AS not_started
   FROM product
       WHERE product_status = 'for sale'
         AND start_date BETWEEN ? AND ? ${whereSeller}`,
  params
);





    const conversion = started > 0 ? Math.round((sold / started) * 100) : 0;

    res.json({ started, sold, not_sold,not_started ,conversion   });
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

//מביא את כל המוכרים/קונים לדף סטטיסטיקות וניהול משתמשים של המנהל
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





















//ניהול משתמשים

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
// עדכון סטטוס משתמש-חסום/לא חסום + טיפול במוצרים/הרשמות/מיילים למוכרים
// עדכון סטטוס משתמש-חסום/לא חסום + טיפול במוצרים/הרשמות/מיילים
router.put("/users/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // "active" | "blocked"

  if (!["active", "blocked"].includes(status)) {
    return res.status(400).json({ error: "status לא תקין" });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1) המשתמש
    const [usersRows] = await conn.execute(
      `SELECT id, role, id_number, email, first_name, last_name, status 
       FROM users WHERE id = ? LIMIT 1`,
      [id]
    );
    if (!usersRows.length) {
      await conn.rollback();
      return res.status(404).json({ error: "משתמש לא נמצא" });
    }
    const user = usersRows[0];

    // 2) עדכון סטטוס המשתמש
    const [upd] = await conn.execute(
      "UPDATE users SET status = ? WHERE id = ?",
      [status, id]
    );
    if (upd.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ error: "עדכון סטטוס נכשל" });
    }

    // אם לא מוכר – אין לוגיקת מוצרים/הרשמות, אך עדיין נשלח מייל סטטוס
    if (user.role !== "seller") {
      // שליחת מייל סטטוס לקונה
      try {
        if (user.email) {
          if (status === "blocked") {
            await sendMail({
              to: user.email,
              subject: "עדכון חשבון – החשבון נחסם",
              text:
                `שלום ${user.first_name || ""} ${user.last_name || ""},

חשבונך הוגבל ואינו זמין לשימוש, מאחר שאינך עומד/ת בתנאי השימוש של BidSmart.
במידה ואת/ה סבור/ה שמדובר בטעות או ברצונך להשיב את החשבון לפעילות, נשמח לסייע דרך הדוא״ל: support@bidsmart.com.

בברכה,
צוות BidSmart`
            });
          } else {
            await sendMail({
              to: user.email,
              subject: "עדכון חשבון – החשבון הוחזר לפעילות",
              text:
                `שלום ${user.first_name || ""} ${user.last_name || ""},

שמחים לעדכן שחשבונך הוחזר למצב פעיל ותוכלו לשוב ולהשתמש במערכת BidSmart.

אם עולה שאלה כלשהי – אנחנו כאן: support@bidsmart.com.

בברכה,
צוות BidSmart`
            });
          }
        }
      } catch (mailErr) {
        console.error("שליחת מייל סטטוס לקונה נכשלה:", mailErr);
      }

      await conn.commit();
      return res.json({ message: "סטטוס עודכן בהצלחה (קונה)", affectedProducts: 0, emailsSent: 1, quotationsDeleted: 0 });
    }

    // מוכר: יש לוגיקה נוספת
    const sellerIdNum = user.id_number;
    if (!sellerIdNum) {
      // אם אין ת"ז – נשלח רק מייל סטטוס למוכר
      if (user.email) {
        try {
          if (status === "blocked") {
            await sendMail({
              to: user.email,
              subject: "עדכון חשבון מוכר – החשבון נחסם",
              text:
                `שלום ${user.first_name || ""} ${user.last_name || ""},

חשבונך כמוכר הוגבל ואינו זמין לשימוש בשל אי-עמידה בתנאי השימוש של BidSmart.
במהלך תקופת ההגבלה לא ניתן יהיה לנהל מכירות או לקבל הצעות על מוצרים המשויכים לחשבון.

לסיוע בבדיקת הנושא או בקשה להשבת החשבון לפעילות, אנא צרו קשר בכתובת:
support@bidsmart.com

אנו מתנצלים על אי-הנוחות.

בברכה,
צוות BidSmart`
            });
          } else {
            await sendMail({
              to: user.email,
              subject: "עדכון חשבון מוכר – החשבון הוחזר לפעילות",
              text:
                `שלום ${user.first_name || ""} ${user.last_name || ""},

שמחים לעדכן שחשבונך כמוכר הוחזר לפעילות.
מוצרים שסווגו בעבר כ-"admin blocked" עודכנו בהתאם למועד ההתחלה שהוגדר לכל מוצר.

לכל שאלה: support@bidsmart.com.

בברכה,
צוות BidSmart`
            });
          }
        } catch (mailErr) {
          console.error("שליחת מייל סטטוס למוכר נכשלה:", mailErr);
        }
      }
      await conn.commit();
      return res.json({ message: "סטטוס עודכן (Seller ללא ת״ז)", affectedProducts: 0, emailsSent: 1, quotationsDeleted: 0 });
    }

    let affectedProducts = 0;
    let emailsSent = 0;
    let quotationsDeleted = 0;

    if (status === "blocked") {
      // --- חסימת מוכר ---
      // מוצרים שלו
      const [prodRows] = await conn.execute(
        `SELECT product_id, product_name 
           FROM product 
          WHERE seller_id_number = ?`,
        [sellerIdNum]
      );
      const productIds = prodRows.map(r => r.product_id);

      if (productIds.length > 0) {
        // 2) עדכן סטטוס מוצרים ל-admin blocked + כיבוי live
        const placeholders = productIds.map(() => "?").join(",");
        const [updProducts] = await conn.execute(
          `UPDATE product 
             SET product_status = 'admin blocked', is_live = 0 
           WHERE product_id IN (${placeholders})`,
          productIds
        );
        affectedProducts = updProducts.affectedRows || 0;

        // 2) שליפת נרשמים (קונים) ושליחת מייל ביטול
        const [buyers] = await conn.execute(
          `SELECT q.product_id, p.product_name, q.buyer_id_number, u.email
             FROM quotation q
             JOIN product p ON p.product_id = q.product_id
        LEFT JOIN users   u ON u.id_number = q.buyer_id_number
            WHERE q.product_id IN (${placeholders})`,
          productIds
        );

        // סט למניעת כפילויות על אותו (product_id,buyer_id_number)
        const sentPairs = new Set();
        for (const row of buyers) {
          if (!row.email) continue;
          const key = `${row.product_id}:${row.buyer_id_number}`;
          if (sentPairs.has(key)) continue;
          sentPairs.add(key);

          try {
            await sendMail({
              to: row.email,
              subject: "ביטול הרשמה למכירה – BidSmart",
              text:
                `שלום,

הרשמתך למכירה על המוצר:
${row.product_name} (מזהה מוצר: ${row.product_id})
בוטלה.

הסיבה: חשבון המוכר הוגבל ע״י הנהלת האתר עקב אי-עמידה בתנאי השימוש.
אנו מתנצלים על אי-הנוחות ונשמח לראותך במכירות אחרות בקרוב.

בברכה,
צוות BidSmart`
            });
            emailsSent++;
          } catch (mailErr) {
            console.error("שגיאה בשליחת מייל ביטול לקונה:", mailErr);
          }
        }

        // 3) מחיקת כל ההרשמות/הצעות למוצרים אלו
        const [delQ] = await conn.execute(
          `DELETE FROM quotation WHERE product_id IN (${placeholders})`,
          productIds
        );
        quotationsDeleted = delQ.affectedRows || 0;
      }

      // 4) מייל סטטוס למוכר
      try {
        if (user.email) {
          await sendMail({
            to: user.email,
            subject: "עדכון חשבון מוכר – החשבון נחסם",
            text:
              `שלום ${user.first_name || ""} ${user.last_name || ""},

חשבונך כמוכר הוגבל ואינו זמין לשימוש, מאחר שלא עמד בתנאי השימוש של BidSmart.
במהלך תקופת ההגבלה לא ניתן יהיה לפרסם מוצרים, לנהל מכירות או לקבל הצעות.

במידה וברצונך לערער או להשיב את החשבון לפעילות, ניתן ליצור קשר בדוא״ל:
support@bidsmart.com

נשמח לסייע ונעבוד יחד למציאת פתרון.
בברכה,
צוות BidSmart`
          });
          emailsSent++;
        }
      } catch (mailErr) {
        console.error("שגיאה בשליחת מייל סטטוס למוכר:", mailErr);
      }

      await conn.commit();
      return res.json({
        message: "המוכר נחסם. מוצרים סומנו 'admin blocked', הרשמות נמחקו ונשלחו מיילים.",
        affectedProducts,
        emailsSent,
        quotationsDeleted
      });
    } else {
      // --- החזרה לפעיל ---
      const [restoreRows] = await conn.execute(
        `SELECT product_id 
           FROM product 
          WHERE seller_id_number = ? AND product_status = 'admin blocked'`,
        [sellerIdNum]
      );
      if (restoreRows.length > 0) {
        const ids = restoreRows.map(r => r.product_id);
        const placeholders = ids.map(() => "?").join(",");

        // עדכון לפי start_date
        const [updBack] = await conn.execute(
          `UPDATE product
              SET product_status = CASE 
                                     WHEN start_date > NOW() THEN 'for sale'
                                     ELSE 'Not sold'
                                   END
            WHERE product_id IN (${placeholders})`,
          ids
        );
        affectedProducts = updBack.affectedRows || 0;
      }

      // מייל סטטוס למוכר – חזר לפעיל
      try {
        if (user.email) {
          await sendMail({
            to: user.email,
            subject: "עדכון חשבון מוכר – החשבון הוחזר לפעילות",
            text:
              `שלום ${user.first_name || ""} ${user.last_name || ""},

שמחים לעדכן שחשבונך כמוכר הוחזר לפעילות.
מוצרים שסווגו בעבר כ-"admin blocked" עודכנו: אם מועד ההתחלה שלהם טרם הגיע – הוחזרו ל-"for sale"; ואם המועד כבר עבר – סווגו כ-"Not sold".

במידה ונדרשת הבהרה נוספת – נשמח לעזור: support@bidsmart.com.

בברכה,
צוות BidSmart`
          });
          emailsSent++;
        }
      } catch (mailErr) {
        console.error("שגיאה בשליחת מייל החזרה לפעיל:", mailErr);
      }

      await conn.commit();
      return res.json({
        message: "המוכר הוחזר לפעיל. מוצרים הושבו בהתאם ל-start_date ונשלח מייל למוכר.",
        affectedProducts,
        emailsSent
      });
    }
  } catch (error) {
    await conn.rollback();
    console.error("שגיאה בעדכון סטטוס:", error);
    res.status(500).json({ error: "שגיאה בשרת" });
  }
});



// מוצרים של מוכר מסוים לפי ת״ז (למנהל)
router.get("/seller/:id_number/products", async (req, res) => {
  const { id_number } = req.params;
  const conn = await db.getConnection();

  try {
    // אותם שדות כמו /management/products + זמן סיום מחושב + תמונות
    const [rows] = await conn.query(`
      SELECT
        p.product_id,
        p.product_name,
        p.price,                 -- מחיר פתיחה
        p.current_price,
        p.product_status AS product_status,
        p.product_status AS status,   -- אליאס תואם לקוד קיים
        p.is_live,
        p.start_date,
        p.end_time,                    -- משך המכרז (TIME)
        ADDTIME(p.start_date, COALESCE(p.end_time,'00:00:00')) AS end_at, -- זמן סיום בפועל
        p.winner_id_number,
        p.description,

        -- נתוני מכירה/משלוח (מטבלת sale)
        sa.sent,
        sa.is_delivered,
        sa.delivery_method,
        sa.city, sa.street, sa.house_number, sa.apartment_number, sa.zip, sa.notes,

        -- קטגוריות/תתי־קטגוריות
        p.category_id, p.subcategory_id,
        c.name  AS category_name,
        sc.name AS subcategory_name,

        -- פרטי המוכר
        u.id_number AS seller_id_number,
        u.first_name,
        u.last_name,
        CONCAT(u.first_name, ' ', u.last_name) AS seller_name

      FROM product p
      LEFT JOIN sale          sa ON sa.product_id     = p.product_id
      LEFT JOIN categories     c ON p.category_id     = c.id
      LEFT JOIN subcategories sc ON p.subcategory_id  = sc.id
      LEFT JOIN users          u ON p.seller_id_number = u.id_number
      WHERE p.seller_id_number = ?
      ORDER BY p.product_id DESC
    `, [id_number]);

    if (!rows.length) return res.json([]);

    // שליפת תמונות לכל המוצרים שנמצאו
    const ids = rows.map(p => p.product_id);
    const [imgs] = await conn.query(
      `SELECT product_id, image_id, image_url
         FROM product_images
        WHERE product_id IN (${ids.map(() => "?").join(",")})
        ORDER BY product_id, image_id`,
      ids
    );

    // מיפוי product_id -> images[]
    const imgsMap = new Map();
    for (const r of imgs) {
      if (!imgsMap.has(r.product_id)) imgsMap.set(r.product_id, []);
      imgsMap.get(r.product_id).push(r.image_url);
    }

    // העשרה במערך תמונות
    const enriched = rows.map(p => ({
      ...p,
      images: imgsMap.get(p.product_id) || []
    }));

    return res.json(enriched);
  } catch (err) {
    console.error("שגיאה בשליפת מוצרים למוכר:", err);
    return res.status(500).json({ success: false, message: "שגיאה בשליפת מוצרים למוכר" });
  } finally {
    try { conn.release?.(); } catch {}
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

module.exports = router;
