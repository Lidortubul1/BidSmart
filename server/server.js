const express = require("express");
const cors = require("cors");
const productRoutes = require("./products");
const authRoutes = require("./auth");
const quotationRoutes = require("./quotation");
const categoryRoutes = require("./categories.js");
const db = require("./database");

const app = express();
const PORT = 5000;

// מאפשר קריאות מהדפדפן
app.use(cors());

// כדי שנוכל לקרוא את מה שנשלח ב־req.body כ־JSON
app.use(express.json());

// נתיבים
app.use("/api", authRoutes); // התחברות, הרשמה
app.use("/api", quotationRoutes); // הצעות ומכירה
app.use("/api/product", productRoutes); // מוצרים
app.use("/api/categories", categoryRoutes); // קטגוריות

// בדיקה שהחיבור למסד נתונים תקין
db.getConnection()
  .then(async (conn) => {
    const [rows] = await conn.execute("SELECT COUNT(*) as count FROM product");
    console.log("מספר מוצרים במסד הנתונים:", rows[0].count);
  })
  .catch((err) => {
    console.error("שגיאה בבדיקת מסד הנתונים:", err.message);
  });

console.log("קטגוריות נטענו");

// הפעלת השרת
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
