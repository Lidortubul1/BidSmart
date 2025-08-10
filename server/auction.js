const express = require("express");
const router = express.Router();
const db = require("./database");


//נכנס לפונקציה ברגע שהטיימר נעצר
router.post("/end/:productId", async (req, res) => {
  const { productId } = req.params;

  try {
    const conn = await db.getConnection();

    // בדיקת המוצר
    const [rows] = await conn.query("SELECT winner_id_number FROM product WHERE product_id = ?", [productId]);
    if (!rows.length) {
      return res.status(404).json({ message: "מוצר לא נמצא" });
    }

    if (rows[0].winner_id_number) {
      // יש זוכה – לא משנים product_status
      await conn.query("UPDATE product SET is_live = 0 WHERE product_id = ?", [productId]);
      return res.json({ message: "המכירה הסתיימה עם זוכה" });
    } else {
      // אין זוכה – מעדכנים ל-Not sold
      await conn.query(
        "UPDATE product SET is_live = 0, product_status = 'Not sold' WHERE product_id = ?",
        [productId]
      );
      return res.json({ message: "המכירה הסתיימה ללא זוכה" });
    }
  } catch (err) {
    console.error("שגיאה בסיום מכירה:", err);
    res.status(500).json({ message: "שגיאה בסיום מכירה" });
  }
});


module.exports = router;
