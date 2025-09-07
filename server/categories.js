//server\categories.js
// שליפת קטגוריות ותתי קטגוריות מהמסד והחזרתן במבנה מקונן

const express = require("express");
const router = express.Router();
const db = require("./database");

//שליפת כל הקטגוריות עם תתי קטגוריות
router.get("/category-with-subs", async (req, res) => {
  const conn = await db.getConnection();
  const [categories] = await conn.query("SELECT * FROM categories");
  const [subcategories] = await conn.query("SELECT * FROM subcategories");
  
  const result = categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    subcategories: subcategories
      .filter((sub) => sub.category_id === cat.id)
      .map((sub) => ({ id: sub.id, name: sub.name })),
  }));
  res.json(result);
});



module.exports = router;
