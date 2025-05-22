const express = require("express");
const router = express.Router();
const db = require("./database");

// שליפת כל המכירות

router.get("/all", async (req, res) => {
  try {
    const conn = await db.getConnection();
    const [results] = await conn.execute("SELECT * FROM sale");
    res.json(results); // יחזיר [] אם הטבלה ריקה וזה תקין
  } catch (err) {
    console.error("❌ שגיאה בשליפת מכירות:", err.message);
    res.status(500).json({ error: "שגיאה בשליפת מכירות" });
  }
});

module.exports = router;