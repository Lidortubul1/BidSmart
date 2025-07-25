const express = require("express");
const router = express.Router();
const db = require("./database");
const multer = require("multer");

//אחסון תמונות
const storage = require("./storage");
const upload = multer({ storage });

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
        p.start_time,
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
    start_date,
    end_date,
    start_time,
    // הוסף שדות נוספים במידת הצורך
  } = req.body;
  const conn = await db.getConnection();
  try {
    await conn.query(
      `UPDATE product SET 
        product_name = COALESCE(?, product_name),
        price = COALESCE(?, price),
        current_price = COALESCE(?, current_price),
        category_id = COALESCE(?, category_id),
        subcategory_id = COALESCE(?, subcategory_id),
        product_status = COALESCE(?, product_status),
        description = COALESCE(?, description),
        is_live = COALESCE(?, is_live),
        start_date = COALESCE(?, start_date),
        end_date = COALESCE(?, end_date),
        start_time = COALESCE(?, start_time)
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
        start_date,
        end_date,
        start_time,
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


module.exports = router;
