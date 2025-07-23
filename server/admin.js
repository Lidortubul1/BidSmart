const express = require("express");
const router = express.Router();
const db = require("./database");

//נתונים כללים של הלוח בקרה 
router.get("/stats", async (req, res) => {
  try {
    const conn = await db.getConnection();

    const [[{ totalSellers }]] = await conn.query(
      "SELECT COUNT(*) AS totalSellers FROM users WHERE role = 'seller'"
    );

    const [[{ totalUsers }]] = await conn.query(
      "SELECT COUNT(*) AS totalUsers FROM users WHERE role IN ('buyer', 'seller')"
    );

    const [[{ deliveredSales }]] = await conn.query(
      "SELECT COUNT(*) AS deliveredSales FROM sale WHERE is_delivered = 1 AND sent = 'yes'"
    );

    const [[{ undeliveredSales }]] = await conn.query(
      "SELECT COUNT(*) AS undeliveredSales FROM sale WHERE is_delivered = 0"
    );

    const [[{ upcomingProducts }]] = await conn.query(
      "SELECT COUNT(*) AS upcomingProducts FROM product WHERE is_live = 0"
    );

    const [[{ unsoldProducts }]] = await conn.query(
      "SELECT COUNT(*) AS unsoldProducts FROM product WHERE is_live = 1 AND winner_id_number IS NULL"
    );

    res.json({
      totalSellers,
      totalUsers,
      deliveredSales,
      undeliveredSales,
      upcomingProducts,
      unsoldProducts,
    });
  } catch (error) {
    console.error("שגיאה בקבלת סטטיסטיקות:", error);
    res.status(500).json({ error: "שגיאה בשרת" });
  }
});


// שליפת כל המשתמשים (ללא סיסמה)
router.get("/users", async (req, res) => {
  try {
    const conn = await db.getConnection();
    const [rows] = await conn.query(
      `SELECT 
        id_number, 
        first_name, 
        last_name, 
        email, 
        role, 
        status, 
        id_number, 
        registered, 
        phone, 
        zip, 
        city, 
        street, 
        house_number, 
        apartment_number, 
        profile_photo,
        rating    
      FROM users`
    );

    res.json(rows);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: "שגיאה בשליפת משתמשים" });
  }
});


// עדכון סטטוס משתמש
router.put("/users/:email/status", async (req, res) => {
  const { email } = req.params;
  const { status } = req.body;
  try {
    const conn = await db.getConnection();
    const [result] = await conn.query(
      "UPDATE users SET status = ? WHERE email = ?",
      [status, email]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "משתמש לא נמצא" });
    }
    res.json({ message: "סטטוס עודכן בהצלחה" });
  } catch (error) {
    console.error("שגיאה בעדכון סטטוס:", error);
    res.status(500).json({ error: "שגיאה בשרת" });
  }
});


//עריכת משתמש ע"י המנהל מערכת
router.put("/users/:email", async (req, res) => {
  const { email } = req.params;
  // שלוף את כל השדות מה־body כמו קודם
  const {
    first_name,
    last_name,
    phone,
    role,
    profile_photo,
    rating,
    country,
    zip,
    city,
    street,
    house_number,
    apartment_number,
    // id_card_photo -- עריכה בעתיד
  } = req.body;
    // ודא ש-rating הוא מספר או null
console.log("Rating received:", rating);
console.log("rating type:", typeof rating, rating);
console.log("email:", email);


  try {

    const conn = await db.getConnection();
    const [result] = await conn.query(
      `UPDATE users SET
        first_name = ?,
        last_name = ?,
        phone = ?,
        role = ?,
        profile_photo = ?,
        rating = ?,
        country = ?,
        zip = ?,
        city = ?,
        street = ?,
        house_number = ?,
        apartment_number = ?
      WHERE email = ?`,
      [
        first_name,
        last_name,
        phone,
        role,
        profile_photo,
        rating,
        country,
        zip,
        city,
        street,
        house_number,
        apartment_number,
        email, // פה!
      ]
    );
    res.json({ message: "המשתמש עודכן בהצלחה" });
  } catch (error) {
    console.error("שגיאה בעדכון משתמש:", error);
    res.status(500).json({ error: "שגיאה בשרת" });
  }
});

//פונקציה למחיקת משתמש לצמיתות ע"י המנהל
router.delete("/user/:email", async (req, res) => {
  try {
    const { email } = req.params;
    // לדוג' MySQL
    await connection.query("DELETE FROM users WHERE email = ?", [email]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "שגיאה במחיקת המשתמש" });
  }
});

module.exports = router;
