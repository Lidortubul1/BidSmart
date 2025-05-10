const express = require("express");
const cors = require("cors");
const productRoutes = require("./products");
const authRoutes = require("./auth");
const quotationRoutes = require("./quotation");
const db = require("./database");

const app = express();
const PORT = 5000;

//מאפשר קריאות מהדפדפן
app.use(cors());

// כדי שנוכל לקרוא את מה שנשלח ב־req.body כ־JSON
app.use(express.json());

// נתיבים של התחברות, הרשמה וכו'
app.use("/api", authRoutes);

// נתיב שמקבל הצעות מחיר ממוצרים
app.use("/api", quotationRoutes);

// נתיבים של מוצרים – קבלה, הוספה
app.use("/api/product", productRoutes);

// בדיקה שהחיבור למסד נתונים תקין
db.getConnection();

// מפעיל את השרת
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
