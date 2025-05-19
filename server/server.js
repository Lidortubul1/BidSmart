const express = require("express");
const cors = require("cors");
const productRoutes = require("./products.js");
const authRoutes = require("./auth");
const quotationRoutes = require("./quotation");
const categoryRoutes = require("./categories.js");
const db = require("./database.js");

const app = express();
const PORT = 5000;
// גישה לתמונות בתקייה uploads
app.use("/uploads", express.static("uploads"));

// מאפשר קריאות מהדפדפן
app.use(cors());

app.use("/api/product", productRoutes);

// כדי שנוכל לקרוא את מה שנשלח ב־req.body כ־JSON
app.use(express.json());

// נתיבים של התחברות, הרשמה וכו'
app.use("/api", authRoutes);

// נתיב שמקבל הצעות מחיר ממוצרים
app.use("/api", quotationRoutes);

// נתיבים של מוצרים – קבלה, הוספה


// נתיב של קטגוריות
app.use("/api/categories", categoryRoutes);

// בדיקה שהחיבור למסד נתונים תקין
// db.getConnection();
db.getConnection().then((conn) => {
  conn.query("SELECT DATABASE() AS db").then(([rows]) => {
    console.log("📛 מחובר למסד:", rows[0].db);
  });
});

// הפעלת השרת
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
