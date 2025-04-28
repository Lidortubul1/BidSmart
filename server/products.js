const express = require("express");
const router = express.Router();
const db = require("./database");

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
router.post("/", async (req, res) => {
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
  } = req.body;

  if (
    !product_name ||
    !start_date ||
    !end_date ||
    !price ||
    !seller_id_number ||
    !product_status
  ) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const connection = await db.getConnection();
    await connection.execute(
      `INSERT INTO product
        (product_name, start_date, end_date, price, image, description, seller_id_number, product_status, category)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      ]
    );
    res.json({ message: "Product created successfully" });
  } catch (e) {
    res.status(500).json({ error: "Failed to create product" });
  }
});


module.exports = router;
