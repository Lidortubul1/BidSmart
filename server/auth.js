const express = require("express");
const router = express.Router();
const db = require("./database");
const bcrypt = require("bcrypt");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

// אחסון קבצים
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, "../uploads");
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

/** התחברות */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const conn = await db.getConnection();
    const [rows] = await conn.execute("SELECT * FROM users WHERE email = ?", [
      email,
    ]);

    if (rows.length === 0) {
      return res.json({ success: false, message: "משתמש לא נמצא" });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.json({ success: false, message: "סיסמה שגויה" });
    }

    req.session.user = {
      email: user.email,
      role: user.role,
      id_number: user.id_number,
      id_card_photo: user.id_card_photo,
      profile_photo: user.profile_photo,
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone,
      country: user.country,
      zip: user.zip,
      city: user.city,
      street: user.street,
      house_number: user.house_number,
      apartment_number: user.apartment_number,
    };

    res.json({ success: true, user: req.session.user });
  } catch (err) {
    console.error("שגיאה בהתחברות:", err);
    res.status(500).json({ success: false, message: "שגיאה בשרת" });
  }
});

/** בדיקת session */
router.get("/session", (req, res) => {
  if (req.session.user) {
    res.json({ loggedIn: true, user: req.session.user });
  } else {
    res.json({ loggedIn: false });
  }
});

/** הרשמה */
router.post("/register", async (req, res) => {
  const { first_name, last_name, email, password } = req.body;

  if (!first_name || !last_name || !email || !password) {
    return res.status(400).json({ message: "נא למלא את כל השדות" });
  }

  try {
    const conn = await db.getConnection();
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
    console.error("שגיאה בהרשמה:", err);
    res.status(500).json({ message: "שגיאה בשרת" });
  }
});

/** עדכון פרופיל כללי */
router.put("/update-profile",
  upload.fields([
    { name: "id_card_photo", maxCount: 1 },
    { name: "profile_photo", maxCount: 1 },
  ]),
  async (req, res) => {
    const {
      email: currentEmail,
      new_email,
      first_name,
      last_name,
      id_number,
      password,
      phone,
      country,
      zip,
      city,
      street,
      house_number,
      apartment_number,
    } = req.body;

    if (!currentEmail) {
      return res
        .status(400)
        .json({ success: false, message: "חסר שדה אימייל" });
    }

    try {
      const id_card_photo = req.files?.id_card_photo?.[0]?.filename;
      const profile_photo = req.files?.profile_photo?.[0]?.filename;
      const conn = await db.getConnection();

      let query = `
        UPDATE users SET
        first_name = ?, last_name = ?, id_number = ?, phone = ?, country = ?,
        zip = ?, city = ?, street = ?, house_number = ?, apartment_number = ?
      `;
      const values = [
        first_name,
        last_name,
        id_number,
        phone,
        country,
        zip,
        city,
        street,
        house_number,
        apartment_number,
      ];

      if (id_card_photo) {
        query += ", id_card_photo = ?";
        values.push(id_card_photo);
      }

      if (profile_photo) {
        query += ", profile_photo = ?";
        values.push(profile_photo);
      }

      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        query += ", password = ?";
        values.push(hashedPassword);
      }

      if (new_email) {
        query += ", email = ?";
        values.push(new_email);
      }

      query += " WHERE email = ?";
      values.push(currentEmail);

      await conn.execute(query, values);

      const [updated] = await conn.execute(
        "SELECT * FROM users WHERE email = ?",
        [new_email || currentEmail]
      );

      req.session.user = updated[0];

      res.json({ success: true, updatedUser: updated[0] });
    } catch (err) {
      console.error("שגיאה בעדכון פרופיל:", err.message);
      res.status(500).json({ success: false, message: "שגיאה בשרת" });
    }
  }
);

/** התנתקות */
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("שגיאה במחיקת session:", err);
      return res
        .status(500)
        .json({ success: false, message: "שגיאה בהתנתקות" });
    }

    res.clearCookie("connect.sid"); // מוחק את הקוקי של הסשן
    res.json({ success: true, message: "התנתקת בהצלחה" });
  });
});

// הפיכה מקונה למוכר
router.put( "/upgrade-role",
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

// שינוי סיסמה
router.put("/change-password", async (req, res) => {
  const { email, currentPassword, newPassword } = req.body;

  if (!email || !currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: "חסרים שדות חובה" });
  }

  try {
    const conn = await db.getConnection();

    // שליפת המשתמש
    const [rows] = await conn.execute("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "משתמש לא נמצא" });
    }

    const user = rows[0];

    // בדיקת סיסמה נוכחית
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "הסיסמה הנוכחית שגויה" });
    }

    // בדיקת חוזק בסיסמה החדשה
    const strong = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/.test(newPassword);
    if (!strong) {
      return res
        .status(400)
        .json({ success: false, message: "הסיסמה החדשה אינה עומדת בדרישות" });
    }

    // הצפנה ועדכון
    const hashed = await bcrypt.hash(newPassword, 10);
    await conn.execute("UPDATE users SET password = ? WHERE email = ?", [
      hashed,
      email,
    ]);

    res.json({ success: true, message: "הסיסמה עודכנה בהצלחה" });
  } catch (err) {
    console.error("שגיאה בשינוי סיסמה:", err.message);
    res.status(500).json({ success: false, message: "שגיאה בשרת" });
  }
});

// שכחת סיסמה – שליחת מייל עם קישור לשחזור
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: "נא להזין אימייל" });
  }

  try {
    console.log("התחלנו forgot-password", email);

    const conn = await db.getConnection();
    const [users] = await conn.execute("SELECT * FROM users WHERE email = ?", [
      email,
    ]);

    if (users.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "אימייל לא נמצא" });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 3600000); // תוקף לשעה

    await conn.execute(
      "UPDATE users SET reset_token = ?, reset_token_expiration  = ? WHERE email = ?",
      [token, expires, email]
    );

    console.log("שולחת מייל לאימייל:", email, "עם הטוקן:", token);

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "bidsmart2025@gmail.com",
        pass: "zjkkgwzmwjjtcylr", // App password
      },
    });

    const resetLink = `http://localhost:3000/reset-password/${token}`;

    const mailOptions = {
      from: "BidSmart <bidsmart2025@gmail.com>",
      to: email,
      subject: "איפוס סיסמה",
      text: `לחצי על הקישור הבא כדי לאפס את הסיסמה שלך:\n\n${resetLink}`,
    };

    await transporter.sendMail(mailOptions);

    res.json({ success: true, message: "נשלח קישור לאיפוס סיסמה לאימייל" });
  } catch (err) {
    console.error("שגיאה בשליחת מייל איפוס:", err);
    res.status(500).json({ success: false, message: "שגיאה בשליחת מייל" });
  }
});

//קביעת סיסמה חדשה לפי הטוקן
router.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ success: false, message: "חסרים נתונים" });
  }

  try {
    const conn = await db.getConnection();
    const [users] = await conn.execute(
      "SELECT * FROM users WHERE reset_token = ? AND reset_token_expiration > NOW()",
      [token]
    );

    if (users.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "הקישור לא תקף או פג תוקף" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await conn.execute(
      "UPDATE users SET password = ?, reset_token = NULL, reset_token_expiration = NULL WHERE email = ?",
      [hashed, users[0].email]
    );

    res.json({ success: true, message: "הסיסמה עודכנה בהצלחה" });
  } catch (err) {
    console.error("שגיאה באיפוס סיסמה:", err.message);
    res.status(500).json({ success: false, message: "שגיאה בשרת" });
  }
});

module.exports = router;
