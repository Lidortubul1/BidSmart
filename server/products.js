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
    console.log(products[0])
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
    end_time,
    price,
    description,
    seller_id_number,
    product_status,
    category_id,
    subcategory_id,
    bid_increment,
    vat_included,
  } = req.body;
  console.log("start_date:", start_date); // צריך להיות בפורמט ISO כמו 2025-08-07T14:00
    console.log("end_time:", end_time); // צריך להיות בפורמט של זמן 00:10:00 נניח

  let finalPrice = parseFloat(price);
  let priceBeforeVat = null;
  const isVatIncluded = vat_included === "true";

  if (!isVatIncluded) {
    priceBeforeVat = finalPrice;
    finalPrice = priceBeforeVat * 1.17;
  } else {
    priceBeforeVat = finalPrice / 1.17;
  }

  finalPrice = Number(finalPrice.toFixed(2));
  priceBeforeVat = Number(priceBeforeVat.toFixed(2));

  const files = req.files;

  // בדיקות תקינות שדות
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

  const startDateObj = new Date(start_date);
  if (isNaN(startDateObj.getTime())) {
    return res
      .status(400)
      .json({ success: false, message: "תאריך/שעת התחלה לא תקין" });
  }

  if (startDateObj < new Date()) {
    return res.status(400).json({
      success: false,
      message: "תאריך ההתחלה חייב להיות מתאריך ושעה נוכחיים ואילך",
    });
  }

  if (!end_time) {
    return res
      .status(400)
      .json({ success: false, message: "זמן מכירה לא מלא" });
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
  await conn.beginTransaction();

  try {
    const [result] = await conn.execute(
      `INSERT INTO product (
        product_name,
        start_date,
        end_time,
        price,
        current_price,
        price_before_vat,
        description,
        seller_id_number,
        product_status,
        category_id,
        subcategory_id,
        bid_increment
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        product_name,
        start_date,
        end_time,
        finalPrice,
        finalPrice,
        priceBeforeVat,
        description || null,
        seller_id_number,
        product_status,
        category_id || null,
        subcategory_id || null,
        parseInt(bid_increment) || 10,
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

    console.log("קבצים שהתקבלו:", req.files);
    await conn.commit();
    res.json({ success: true });
  } catch (error) {
    await conn.rollback();
    console.error("שגיאה בהעלאת מוצר:", error);
    res.status(500).json({ success: false, message: "שגיאה בהעלאת מוצר" });
  }
});





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
