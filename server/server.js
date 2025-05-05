const express = require("express");
const cors = require("cors");
const productRoutes = require("./products");
const authRoutes = require("./auth"); // ייבוא auth.js
const db = require("./database");

const app = express();
const PORT = 5000;

// אמצעים כלליים
app.use(cors());
app.use(express.json());

// שימוש בראוטים
app.use("/api/product", productRoutes);
app.use("/api", authRoutes); // זה יטפל ב־ /api/login ו־ /api/register

// התחברות למסד הנתונים
db.getConnection();

// הפעלת השרת
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
