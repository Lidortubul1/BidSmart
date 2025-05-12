const express = require("express");
const router = express.Router();
const db = require("./database");
const multer = require("multer");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // ודא שהתיקיה קיימת
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "_" + file.originalname);
  },
});

const upload = multer({ storage });

// קבלת כל המוצרים
router.get("/", async (req, res) => {
  try {
    const connection = await db.getConnection();
    const [products] = await connection.execute("SELECT * FROM product");
    res.json(products);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

// הוספת מוצר חדש
router.post("/", upload.none(), async (req, res) => {
  const {
    product_name,
    start_date,
    end_date,
    price,
    image,
    description,
    seller_id_number,
    product_status,
    category,
    sub_category, // ← חדש
  } = req.body;

  if (
    !product_name ||
    !start_date ||
    !end_date ||
    !price ||
    !seller_id_number ||
    !product_status
  ) {
    return res.status(400).json({
      success: false,
      message: "יש למלא את כל שדות החובה",
    });
  }

  try {
    const connection = await db.getConnection();

    await connection.execute(
      `INSERT INTO product
      (product_name, start_date, end_date, price, image, description, seller_id_number, product_status, category, sub_category)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        product_name,
        start_date,
        end_date,
        price,
        image || null,
        description || null,
        seller_id_number,
        product_status,
        category || null,
        sub_category || null, 
      ]
    );

    res.json({ success: true });
  } catch (error) {
    console.error("❌ שגיאה בהוספה:", error);
    res.status(500).json({ success: false, message: "שגיאה בשמירת המוצר" });
  }
});

module.exports = router;
