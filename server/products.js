const express = require("express");
const router = express.Router();
const db = require("./database");
const multer = require("multer");

//אחסון תמונות
const storage = require("./storage");
const upload = multer({ storage });

// קבלת כל המוצרים למכירה בלבד שהם לא sale
router.get("/", async (req, res) => {
  try {
    const conn = await db.getConnection();

    const [products] = await conn.execute(
      "SELECT * FROM product WHERE product_status = 'for sale'"
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

// הוספת מוצר חדש
router.post("/", upload.array("images", 5), async (req, res) => {
const {
  product_name,
  start_date,
  start_time,
  end_date,
  price,
  description,
  seller_id_number,
  product_status,
  category,
  sub_category,
  bid_increment, 
} = req.body;

  const files = req.files;

  //  אימות שדות חובה לפי הדרישות
  if (!product_name || product_name.trim() === "") {
    return res
      .status(400)
      .json({ success: false, message: "שם המוצר הוא שדה חובה" });
  }

  if (!start_date) {
    return res
      .status(400)
      .json({ success: false, message: "תאריך התחלה הוא שדה חובה" });
  }

  const now = new Date();
  const startDateObj = new Date(start_date);
  if (isNaN(startDateObj.getTime())) {
    return res
      .status(400)
      .json({ success: false, message: "תאריך התחלה לא תקין" });
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (startDateObj < today) {
    return res.status(400).json({
      success: false,
      message: "תאריך ההתחלה חייב להיות מתאריך היום ואילך",
    });
  }

  if (!start_time) {
    return res
      .status(400)
      .json({ success: false, message: "שעת התחלה היא שדה חובה" });
  }

  if (!end_date) {
    return res
      .status(400)
      .json({ success: false, message: "תאריך סיום הוא שדה חובה" });
  }

  const endDateObj = new Date(end_date);
  if (isNaN(endDateObj.getTime())) {
    return res
      .status(400)
      .json({ success: false, message: "תאריך סיום לא תקין" });
  }
  if (endDateObj <= startDateObj) {
    return res.status(400).json({
      success: false,
      message: "תאריך הסיום חייב להיות אחרי תאריך ההתחלה",
    });
  }

  if (!price || isNaN(price)) {
    return res.status(400).json({
      success: false,
      message: "מחיר הוא שדה חובה וצריך להיות מספר",
    });
  }
  if (!bid_increment || isNaN(bid_increment)) {
    return res.status(400).json({
      success: false,
      message: "יש לבחור סכום עליית הצעה תקין",
    });
  }

  const conn = await db.getConnection();
  await conn.beginTransaction(); //פעולה שמאפשרת לקבץ כמה פקודות SQL ביחד – כך שאם אחת מהן נכשלת, כולן מתבטלות

  try {
const [result] = await conn.execute(
  `INSERT INTO product (
    product_name,
    start_date,
    start_time,
    end_date,
    price,
    current_price,
    description,
    seller_id_number,
    product_status,
    category,
    sub_category,
    bid_increment
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [
    product_name,
    start_date,
    start_time,
    end_date,
    price,
    price, // current_price
    description || null,
    seller_id_number,
    product_status,
    category || null,
    sub_category || null,
    parseInt(bid_increment) || 10, //ברירת מחדל ל10
  ]
);


    const productId = result.insertId;

    for (const file of files) {
      const imagePath = "/uploads/" + file.filename;
      await conn.execute(
        "INSERT INTO product_images (product_id, image_url) VALUES (?, ?)",
        [productId, imagePath]
      );
    }

    console.log(" קבצים שהתקבלו:", req.files);
    await conn.commit();
    res.json({ success: true });
  } catch (error) {
    await conn.rollback(); //מבטל את כל השינויים שנעשו במסד הנתונים מאז שהתחילה הטרנזקציה וחוזר למצב הקודם
    console.error(" שגיאה בהעלאת מוצר:", error);
    res.status(500).json({ success: false, message: "שגיאה בהעלאת מוצר" });
  }
});

//מחזיר מוצר לפי product_id (אם עוד לא קיים)
// שליפת מוצר בודד לפי product_id
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const conn = await db.getConnection();

    // שליפת פרטי המוצר
    const [rows] = await conn.execute(
      "SELECT * FROM product WHERE product_id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "המוצר לא נמצא" });
    }

    const product = rows[0];

    //  כאן מוסיפים שליפת תמונות
    const [images] = await conn.execute(
      "SELECT image_url FROM product_images WHERE product_id = ?",
      [id]
    );

    product.images = images.map((img) => img.image_url); // מוסיף שדה images עם מערך כתובות תמונה

    res.json(product); 
  } catch (err) {
    console.error(" שגיאה בשרת בשליפת מוצר:", err.message);
    res.status(500).json({ message: "שגיאה בשרת" });
  }
});

module.exports = router;
