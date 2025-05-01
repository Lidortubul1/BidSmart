//ייבוא ספריות
const express = require("express");
const cors = require("cors");

const app = express(); //האובייקט שמייצג את השרת
const PORT = 5000; //הפורט שעליו השרת מאזין

// אמצעים - middlewares
app.use(cors()); //מאפשר לשרת לקבל בקשות ממחשבים אחרים
app.use(express.json()); // מאפשר לשרת להבין בקשות שמגיעות בפורמט JSON.

// מסלול התחברות
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  // בדיקה פשוטה
  if (email === "test@test.com" && password === "123456") {
    res.json({ success: true, message: "התחברת בהצלחה!" });
  } else {
    res.json({ success: false, message: "אימייל או סיסמה שגויים" });
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
