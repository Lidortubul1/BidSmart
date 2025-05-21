const express = require("express");
const session = require("express-session");
const cors = require("cors");
const productRoutes = require("./products.js");
const authRoutes = require("./auth");
const quotationRoutes = require("./quotation");
const categoryRoutes = require("./categories.js");
const db = require("./database.js");

const app = express();
const PORT = 5000;

//כדי שנוכל לקרוא JSON מ־req.body
app.use(express.json());

//הגדרת CORS אחת ויחידה – לפני session והראוטים
app.use(
  cors({
    origin: "http://localhost:3000", // כתובת הפרונט
    credentials: true, // חובה כשעובדים עם session/cookies
  })
);

// הגדרת session – תמיד אחרי CORS
app.use(
  session({
    secret: "my_secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // רק true אם יש https
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24, // יום
    },
  })
);

// קבצים סטטיים (כמו תמונות) - לא חובה לשים בראש
app.use("/uploads", express.static("uploads"));

// כל הנתיבים
app.use("/api/product", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/quotation", quotationRoutes);

// בדיקת חיבור למסד הנתונים
db.getConnection().then((conn) => {
  conn.query("SELECT DATABASE() AS db").then(([rows]) => {
    console.log(" מחובר למסד:", rows[0].db);
  });
});

// הרצת השרת
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
