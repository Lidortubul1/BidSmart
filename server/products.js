const express = require("express");
const router = express.Router();
const db = require("./database");
const multer = require("multer");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "_" + file.originalname);
  },
});

const upload = multer({ storage });

// קבלת כל המוצרים למכירה בלבד
router.get("/", async (req, res) => {
  try {


    const connection = await db.getConnection();

    const [products] = await connection.execute("SELECT * FROM product");


    if (products.length === 0) {
      console.log(" אין מוצרים בטבלה product (לפי SELECT)");
    }

    res.json(products);
  } catch (e) {
    console.error(" שגיאה בקבלת מוצרים:", e);
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
    sub_category,
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
    console.error("שגיאה בשמירת מוצר:", error);
    res.status(500).json({ success: false, message: "שגיאה בשמירת המוצר" });
  }
});

module.exports = router;
