const express = require("express");
const router = express.Router();
const db = require("./database");
const bcrypt = require("bcrypt");
const multer = require("multer");
const upload = multer({ dest: "uploads/" }); // אם לא הוגדר כבר

//קובץ שכאן נמצא הבאקאנד של הכניסה וההרשמה
// התחברות משתמש
router.post("/login", async (req, res) => {
  const email = req.body.email.trim();
  const password = req.body.password.trim();

  try {
    const connection = await db.getConnection();
    const [rows] = await connection.execute(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (rows.length === 0) {
      return res.json({ success: false, message: "משתמש לא נמצא" });
    }

    const user = rows[0];

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.json({ success: false, message: "סיסמה שגויה" });
    }

    // התחברות מוצלחת
    res.json({
      success: true,
      user: {
        email: user.email,
        role: user.role,
        id_number: user.id_number,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "שגיאה בשרת" });
  }
});


// בקשת POST להרשמה

router.post("/register", async (req, res) => {
  const { first_name, last_name, email, password } = req.body;
console.log("REGISTER BODY:", req.body);

  if (!first_name || !last_name || !email || !password) {
    return res.status(400).json({ message: "נא למלא את כל השדות" });
  }

  try {
    const conn = await db.getConnection(); // כאן משתמשים בפונקציה הקיימת שלך

    const [existing] = await conn.execute(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );
    if (existing.length > 0) {
      return res.status(400).json({ message: "האימייל כבר קיים" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await conn.execute(
      "INSERT INTO users (first_name, last_name, email, password, role) VALUES (?, ?, ?, ?, 'buyer')",
      [first_name, last_name, email, hashedPassword]
    );

    res.status(201).json({ message: "נרשמת בהצלחה!" });
  } catch (err) {
    console.error("שגיאה בשרת:", err);
    res.status(500).json({ message: "שגיאה בשרת" });
  }
});

router.put("/users/upgrade-role", upload.single("id_card_photo"), async (req, res) => {
  const { email, id_number } = req.body;

  if (!email || !id_number) {
    return res.status(400).json({ message: "חסר אימייל או תז" });
  }

  try {
    const conn = await db.getConnection();

    await conn.execute(
      "UPDATE users SET id_number = ?, id_card_photo = ?, role = 'seller' WHERE email = ?",
      [id_number, req.file?.filename || null, email]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("שגיאה בשדרוג למוכר:", err);
    res.status(500).json({ message: "שגיאה בשרת" });
  }
});


module.exports = router;
