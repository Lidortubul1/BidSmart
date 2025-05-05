const express = require("express");
const router = express.Router();
const db = require("./database");
//קובץ שכאן נמצא הבאקאנד של הכניסה וההרשמה
// התחברות משתמש
router.post("/login", async (req, res) => {
  const email = req.body.email.trim();
  const password = req.body.password.trim();

  try {
    const connection = await db.getConnection();
    const [rows] = await connection.execute(
      "SELECT * FROM users WHERE email = ? AND password = ?",
      [email, password]
    );

    if (rows.length > 0) {
      const user = rows[0];
      res.json({
        success: true,
        user: {
          email: user.email,
          role: user.role,
          id_number: user.id_number,
        },
      });
    } else {
      res.json({ success: false });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "שגיאה בשרת" });
  }
});

// מסלול הרשמה
router.post("/register", (req, res) => {
  const { email, password, firstName, lastName } = req.body;

  if (!email || !password || !firstName || !lastName) {
    return res.json({ success: false, message: "נא למלא את כל השדות" });
  }

  res.json({ success: true, message: "נרשמת בהצלחה!" });
});

module.exports = router;
