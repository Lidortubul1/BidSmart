//ייבוא ספריות
const express = require("express");
const cors = require("cors");

const app = express(); //האובייקט שמייצג את השרת
const PORT = 5000; //הפורט שעליו השרת מאזין

// אמצעים - middlewares
app.use(cors()); //מאפשר לשרת לקבל בקשות ממחשבים אחרים
app.use(express.json()); // מאפשר לשרת להבין בקשות שמגיעות בפורמט JSON.

// זה בסדר
app.use("/api/product", productRoutes);

const db = require("./database");
db.getConnection();

// const bcrypt = require("bcrypt"); // אם בעתיד תשתמש בסיסמאות מוצפנות, לא חובה כרגע
app.post("/api/login", async (req, res) => {
  const email = req.body.email.trim();
  const password = req.body.password.trim();

  try {
    const connection = await db.getConnection();
    const [rows] = await connection.execute(
      "SELECT * FROM users WHERE email = ? AND password = ?",
      [email, password]
    );

    if (rows.length > 0) {
      res.json({ success: true });
    } else {
      res.json({ success: false });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "שגיאה בשרת" });
  }
});

// מסלול הרשמה
app.post("/api/register", (req, res) => {
  const { email, password, firstName, lastName } = req.body;

  if (!email || !password || !firstName || !lastName) {
    return res.json({ success: false, message: "נא למלא את כל השדות" });
  }

  // כאן במקום שמירת משתמש אמיתי בבסיס נתונים, אנחנו רק מחזירים הצלחה
  res.json({ success: true, message: "נרשמת בהצלחה!" });
});

// הפעלת השרת
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
