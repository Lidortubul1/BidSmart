const express = require("express");
const router = express.Router();
const db = require("./database");
const bcrypt = require("bcrypt");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// הגדרת אחסון לקבצים (צילום ת"ז + תמונת פרופיל)
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

/**  בדיקת session */
router.get("/session", (req, res) => {
  if (req.session.user) {
    res.json({ loggedIn: true, user: req.session.user });
  } else {
    res.json({ loggedIn: false });
  }
});

/**  הרשמה */
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

/** שדרוג ל־seller עם ת"ז ותמונה */
router.put(
  "/registerToQuotaion",
  upload.single("id_card_photo"),
  async (req, res) => {
    const { email, id_number } = req.body;
    const idCardPath = req.file?.filename;

    if (!email || !id_number || !idCardPath) {
      return res.status(400).json({ message: "נא למלא את כל השדות כולל קובץ" });
    }

    try {
      const conn = await db.getConnection();

      const [existingUsers] = await conn.execute(
        "SELECT * FROM users WHERE email = ?",
        [email]
      );
      if (existingUsers.length === 0) {
        return res.status(404).json({ message: "משתמש לא נמצא" });
      }

      await conn.execute(
        "UPDATE users SET id_number = ?, id_card_photo = ? WHERE email = ?",
        [id_number, idCardPath, email]
      );

      res.json({ success: true, fileName: idCardPath });
    } catch (err) {
      console.error("שגיאה בשדרוג משתמש:", err.message);
      res.status(500).json({ message: "שגיאה בשרת" });
    }
  }
);

router.put(
  "/upgrade-role",
  upload.single("id_card_photo"),
  async (req, res) => {
    const { email, id_number } = req.body;
    const id_card_photo = req.file?.filename;

    if (!email || !id_number || !id_card_photo) {
      return res.status(400).json({ message: "חסרים שדות" });
    }

    try {
      const conn = await db.getConnection();
      await conn.execute(
        "UPDATE users SET id_number = ?, id_card_photo = ?, role = 'seller' WHERE email = ?",
        [id_number, id_card_photo, email]
      );
      res.json({ success: true });
    } catch (err) {
      console.error("שגיאה בשדרוג משתמש:", err);
      res.status(500).json({ success: false });
    }
  }
);

/** יציאה מהמערכת */
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: "שגיאה בהתנתקות" });
    }
    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
});

/**  עדכון פרופיל כללי */
router.put(
  "/update-profile",
  upload.fields([
    { name: "id_card_photo", maxCount: 1 },
    { name: "profile_photo", maxCount: 1 },
  ]),
  async (req, res) => {
    const {
      email,
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

    const id_card_photo = req.files?.id_card_photo?.[0]?.filename;
    const profile_photo = req.files?.profile_photo?.[0]?.filename;

    try {
      const conn = await db.getConnection();

      let query =
        "UPDATE users SET first_name = ?, last_name = ?, id_number = ?, phone = ?, country = ?, zip = ?, city = ?, street = ?, house_number = ?, apartment_number = ?";

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

      query += " WHERE email = ?";
      values.push(email);

      await conn.execute(query, values);

      const [updated] = await conn.execute(
        "SELECT * FROM users WHERE email = ?",
        [email]
      );

      res.json({ success: true, updatedUser: updated[0] });
    } catch (err) {
      console.error("שגיאה בעדכון פרופיל:", err.message);
      res.status(500).json({ success: false, message: "שגיאה בשרת" });
    }
  }
);

module.exports = router;
