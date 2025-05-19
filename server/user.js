const express = require("express");
const router = express.Router();
const db = require("./database");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// הגדרת תיקייה לשמירת התמונות
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, "/uploads");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath);
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + "_" + file.originalname;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

/**
 * עדכון משתמש עם ת"ז וצילום ת"ז
 * כתובת: PUT /api/users/upgrade-role
 */
router.put(
  "/upgrade-role",
  upload.single("id_card_photo"),
  async (req, res) => {
    const { id_number, email } = req.body;
    const idCardPath = req.file?.filename;

    if (!id_number || !email || !idCardPath) {
      return res.status(400).json({ message: "נא למלא את כל השדות כולל קובץ" });
    }

    try {
      const conn = await db.getConnection();

      // בדיקה אם המשתמש קיים
      const [existingUsers] = await conn.execute(
        "SELECT * FROM users WHERE email = ?",
        [email]
      );

      if (existingUsers.length === 0) {
        return res.status(404).json({ message: "משתמש לא נמצא" });
      }

      // עדכון ת"ז וקובץ ת"ז
      await conn.execute(
        "UPDATE users SET id_number = ?, id_card_photo = ? WHERE email = ?",
        [id_number, idCardPath, email]
      );

      res.json({ message: "המשתמש עודכן בהצלחה" });
    } catch (err) {
      console.error("שגיאה בעדכון משתמש:", err.message, err.stack);
      res.status(500).json({ message: "שגיאה בשרת" });
    }
  }
);

module.exports = router;
