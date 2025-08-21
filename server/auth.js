const express = require("express");
const router = express.Router();
const db = require("./database");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const multer = require("multer");

// אחסון קבצים
const storage = require("./storage");
const upload = multer({ storage });

//התחברות למערכת
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

    // תוסיף status כאן!
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
      status: user.status, // הוסף את זה!
    };

    res.json({ success: true, user: req.session.user });
  } catch (err) {
    console.error("שגיאה בהתחברות:", err);
    res.status(500).json({ success: false, message: "שגיאה בשרת" });
  }
});


//session בדיקת
router.get("/session", (req, res) => {
  if (req.session.user) 
   {
     console.log(req.session.user)
    res.json({ loggedIn: true, user: req.session.user });
  } else {
    res.json({ loggedIn: false });
  }
});

//הרשמה למערכת
router.post("/register", async (req, res) => {
  const { first_name, last_name, email, password } = req.body;

  if (!first_name || !last_name || !email || !password) {
    return res.status(400).json({ message: "נא למלא את כל השדות" });
  }

  const strongPassword = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;
  if (!strongPassword.test(password)) {
    return res.status(400).json({
      message: "הסיסמה חייבת לכלול לפחות 6 תווים, אות אחת ומספר אחד",
    });
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

    // שליפה של המשתמש החדש
    const [userRows] = await conn.execute(
      "SELECT first_name, last_name, email, role FROM users WHERE email = ?",
      [email]
    );
    
    const newUser = userRows[0];

    // שמירת המשתמש ב-session
    req.session.user = newUser;

    res.status(201).json({
      success: true,
      message: "נרשמת בהצלחה!",
      user: newUser,
    });
  } catch (err) {
    console.error("שגיאה בהרשמה:", err);
    res.status(500).json({ message: "שגיאה בשרת" });
  }
});

// הוספה לבסיס נתונים צילום ת"ז ות"ז של המשתמש אם לא קיים והוא רוצה להרשם להצעה
router.put("/save-id-info",upload.single("id_card_photo"),async (req, res) => {
    const { id_number, email } = req.body;
    const idCardPath = req.file?.filename;

    if (!id_number || !email || !idCardPath) {
      return res
        .status(400)
        .json({ message: "נא למלא את כל השדות כולל קובץ" });
    }

    try {
      const conn = await db.getConnection();

      const [users] = await conn.execute(
        "SELECT * FROM users WHERE email = ?",
        [email]
      );

      if (users.length === 0) {
        return res.status(404).json({ message: "משתמש לא נמצא" });
      }

      await conn.execute(
        "UPDATE users SET id_number = ?, id_card_photo = ? WHERE email = ?",
        [id_number, idCardPath, email]
      );

      // עדכון session
      const [updated] = await conn.execute(
        "SELECT * FROM users WHERE email = ?",
        [email]
      );
      req.session.user = updated[0];

      res.json({ success: true, message: "עודכן בהצלחה", user: updated[0] });
    } catch (err) {
      console.error("שגיאה בהעלאת תז", err);
      res.status(500).json({ message: "שגיאה בשרת" });
    }
  }
);


//עדכון פרופיל כללי
router.put("/update-profile", upload.fields([ { name: "id_card_photo", maxCount: 1 },{ name: "profile_photo", maxCount: 1 },]),async (req, res) => {
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
      const removeProfilePhoto = req.body.remove_profile_photo === "1";

      const conn = await db.getConnection();

      // 🆕 שליפה מהמסד
      const [existingUsers] = await conn.execute(
        "SELECT * FROM users WHERE email = ?",
        [currentEmail]
      );
      const existingUser = existingUsers[0];

      if (!existingUser) {
        return res
          .status(404)
          .json({ success: false, message: "משתמש לא נמצא" });
      }

      // 🆕 מניעת שינוי/מחיקת ת"ז
      if (existingUser.id_number && existingUser.id_number !== id_number) {
        return res.status(400).json({
          success: false,
          message: "לא ניתן לשנות או למחוק את תעודת הזהות לאחר שהוזנה",
        });
      }
      

      if (phone) {
        if (!/^\+9725\d{1}\d{7}$/.test(phone)) {
          return res.status(400).json({
            success: false,
            message:
              "מספר טלפון לא תקין – חייב להתחיל בקידומת +9725 ולהכיל 7 ספרות לאחריה",
          });
        }
      }
      
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
      if (removeProfilePhoto) {
        query += ", profile_photo = NULL";
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



//התנתקות מהמערכת
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("שגיאה במחיקת session:", err);
      return res.status(500).json({ success: false, message: "שגיאה בהתנתקות" });
    }

    res.clearCookie("connect.sid"); // מוחק את הקוקי של הסשן
    res.json({ success: true, message: "התנתקת בהצלחה" });
  });
});

// הפיכה מקונה למוכר
router.put("/upgrade-role", upload.single("id_card_photo"), async (req, res) => {
  const {
    email,
    id_number,
    delivery_options,
    city,
    street,
    house_number,
    apartment_number,
    zip,
    country,
    phone,
  } = req.body;

  // קובץ ת"ז (אם נשלח)
  const idCardPath = req.file ? req.file.filename : null;

  if (!email) {
    return res.status(400).json({ success: false, message: "חסר אימייל" });
  }

  const allowed = ["delivery", "delivery+pickup"];
  const deliveryValue = allowed.includes(delivery_options)
    ? delivery_options
    : "delivery";

  // נרמול טלפון לספרות בלבד
  const phoneValueRaw = typeof phone === "string" ? phone.replace(/\D/g, "") : "";
  const phoneValue = phoneValueRaw.length > 0 ? phoneValueRaw : null;
  if (phoneValue === null) {
    return res.status(400).json({ success: false, message: "חסר טלפון" });
  }

  // נרמול ת"ז
  const idNumberNorm =
    typeof id_number === "string" && id_number.trim() ? id_number.trim() : null;

  try {
    const conn = await db.getConnection();

    // קיום משתמש + בדיקת KYC קיים
    const [rows] = await conn.execute(
      "SELECT id, id_number, id_card_photo FROM users WHERE email = ?",
      [email]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "משתמש לא נמצא" });
    }
    const hasKycAlready = !!(rows[0].id_number && rows[0].id_card_photo);

    // אם אין KYC במערכת – חובה לשלוח ת"ז + קובץ
    if (!hasKycAlready) {
      if (!idNumberNorm || !idCardPath) {
        return res
          .status(400)
          .json({ success: false, message: "נא למלא תעודת זהות ולצרף קובץ" });
      }
    }

    // עדכון תפקיד ושדות בסיס (ללא undefined)
    await conn.execute(
      `
      UPDATE users
      SET
        role = 'seller',
        delivery_options = ?,
        id_number      = IF(?, ?, id_number),
        id_card_photo  = IF(?, ?, id_card_photo),
        phone          = IF(?, ?, phone)
      WHERE email = ?
      `,
      [
        deliveryValue,

        // id_number
        idNumberNorm !== null,
        idNumberNorm,

        // id_card_photo
        idCardPath !== null,
        idCardPath,

        // phone
        phoneValue !== null,
        phoneValue,

        email,
      ]
    );

    // עדכון/ניקוי כתובת חנות לפי האפשרות
    if (deliveryValue === "delivery+pickup") {
      if (!city || !street || !house_number || !apartment_number || !zip) {
        return res
          .status(400)
          .json({ success: false, message: "נא למלא כתובת חנות לאיסוף עצמי" });
      }
      const countryValue =
        typeof country === "string" && country.trim() ? country.trim() : "ישראל";

      await conn.execute(
        `
        UPDATE users
        SET city = ?, street = ?, house_number = ?, apartment_number = ?, zip = ?, country = ?
        WHERE email = ?
        `,
        [city, street, house_number, apartment_number, zip, countryValue, email]
      );
    } else {
      await conn.execute(
        `
        UPDATE users
        SET city = NULL, street = NULL, house_number = NULL,
            apartment_number = NULL, zip = NULL, country = NULL
        WHERE email = ?
        `,
        [email]
      );
    }

    // --- שליפה לאחר עדכון + רענון ה-session ---
    const [updatedRows] = await conn.execute(
      `SELECT email, role, id_number, id_card_photo, profile_photo,
              first_name, last_name, phone, country, zip, city, street,
              house_number, apartment_number, status, delivery_options
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email]
    );
    const u = updatedRows[0];

    // שמירה ב-session כדי שההרשאות יעבדו מיד
    req.session.user = {
      email: u.email,
      role: u.role,
      id_number: u.id_number,
      id_card_photo: u.id_card_photo,
      profile_photo: u.profile_photo,
      first_name: u.first_name,
      last_name: u.last_name,
      phone: u.phone,
      country: u.country,
      zip: u.zip,
      city: u.city,
      street: u.street,
      house_number: u.house_number,
      apartment_number: u.apartment_number,
      status: u.status,
      delivery_options: u.delivery_options,
    };

    // שמירה מפורשת (אופציונלי; מועיל ב-dev)
    req.session.save((err) => {
      if (err) console.error("session save error:", err);
    });

    return res.json({
      success: true,
      message: "המשתמש עודכן בהצלחה",
      user: req.session.user,
    });
  } catch (err) {
    console.error("שגיאה בעדכון משתמש:", err);
    return res.status(500).json({ success: false, message: "שגיאה בשרת" });
  }
});







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
    const passwordFromDb = String(user.password); // ← המרה בטוחה ל-string

    const isMatch = await bcrypt.compare(currentPassword, passwordFromDb);
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

    const [updated] = await conn.execute(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    req.session.user = updated[0]; // ← רענון ה-session עם המשתמש החדש

    res.status(200).json({ success: true, message: "הסיסמה עודכנה בהצלחה" });
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
