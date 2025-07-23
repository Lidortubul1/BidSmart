const express = require("express");
const router = express.Router();
const db = require("./database");


router.use((req, res, next) => {
  console.log("API CALL", req.method, req.originalUrl);
  next();
});

//נתונים כללים של הלוח בקרה
router.get("/stats", async (req, res) => {
  try {
    const conn = await db.getConnection();

    const [[{ totalSellers }]] = await conn.query(
      "SELECT COUNT(*) AS totalSellers FROM users WHERE role = 'seller'"
    );

    const [[{ totalUsers }]] = await conn.query(
      "SELECT COUNT(*) AS totalUsers FROM users WHERE role IN ('buyer', 'seller')"
    );

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

    res.json({
      totalSellers,
      totalUsers,
      deliveredSales,
      undeliveredSales,
      upcomingProducts,
      unsoldProducts,
    });
  } catch (error) {
    console.error("שגיאה בקבלת סטטיסטיקות:", error);
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
       console.log("נכנס לכאן=", req.params.id);

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

// עדכון סטטוס משתמש
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

module.exports = router;
