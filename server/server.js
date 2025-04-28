// server.js

// ייבוא ספריית express ליצירת שרת
const express = require("express");

// ייבוא ספריית cors לאפשר תקשורת בין דומיינים שונים
const cors = require("cors");

// יצירת מופע של אפליקציית Express
const app = express();

// קביעת פורט שהשרת יאזין עליו
const PORT = 5000;

// --- אמצעים (Middleware) ---
// שימוש ב-cors לאפשר קריאות מה-Frontend
app.use(cors());

// שימוש ב-express.json כדי לאפשר קריאת נתונים בפורמט JSON מהבקשות
app.use(express.json());

// ייבוא קובץ החיבור למסד הנתונים
const db = require("./database");

// יצירת חיבור ראשוני למסד הנתונים
db.getConnection();

// --- מסלולים (Routes) ---

// מסלול התחברות (Login)
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  // בדיקה פשוטה: אם האימייל והסיסמה תואמים לערכים קבועים
  if (email === "test@test.com" && password === "123456") {
    res.json({ success: true, message: "התחברת בהצלחה!" });
  } else {
    res.json({ success: false, message: "אימייל או סיסמה שגויים" });
  }
});

// מסלול הרשמה (Register)
app.post("/api/register", async (req, res) => {
  const { email, password, firstName, lastName } = req.body;

  console.log(req.body); // הדפסת המידע שמתקבל מהלקוח

  // בדיקה אם כל השדות מולאו
  if (!email || !password || !firstName || !lastName) {
    return res
      .status(400)
      .json({ success: false, message: "נא למלא את כל השדות" });
  }

  try {
    // ניסיון לרשום משתמש חדש במסד הנתונים
    await db.register(email, password);

    // החזרת תשובת הצלחה
    res.json({ success: true, message: "נרשמת בהצלחה!" });
  } catch (e) {
    // טיפול בשגיאה אם ההרשמה נכשלה
    return res.status(400).json({ success: false, message: String(e) });
  }
});

// --- הפעלת השרת ---
// הפעלת השרת והאזנה לפורט שהוגדר
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
