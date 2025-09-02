const express = require("express");
const router = express.Router();
const db = require("./database");
// ---- מנהל בלבד ----
function ensureAdmin(req, res, next) {
  const u = req.session?.user;
  if (!u || u.role !== "admin") {
    return res.status(403).json({ success: false, message: "Admin only" });
  }
  next();
}

// שליפת כל המשתמשים
router.get("/", async (req, res) => {
  try {
    const conn = await db.getConnection();
    const [users] = await conn.execute(
      "SELECT id_number, email, first_name, last_name, role, status FROM users"
    );
    res.json(users);
  } catch (err) {
    console.error("שגיאה בשליפת משתמשים:", err);
    res.status(500).json({ error: "שגיאה בשרת" });
  }
});

// עדכון סטטוס
router.put("/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const conn = await db.getConnection();
    await conn.execute("UPDATE users SET status = ? WHERE id_number = ?", [
      status,
      id,
    ]);
    res.json({ success: true });
  } catch (err) {
    console.error("שגיאה בעדכון סטטוס:", err);
    res.status(500).json({ error: "שגיאה בשרת" });
  }
});

// עדכון תפקיד
router.put("/:id/role", async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  try {
    const conn = await db.getConnection();
    await conn.execute("UPDATE users SET role = ? WHERE id_number = ?", [
      role,
      id,
    ]);
    res.json({ success: true });
  } catch (err) {
    console.error("שגיאה בעדכון תפקיד:", err);
    res.status(500).json({ error: "שגיאה בשרת" });
  }
});

// מחיקת משתמש
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const conn = await db.getConnection();
    await conn.execute("DELETE FROM users WHERE id_number = ?", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("שגיאה במחיקת משתמש:", err);
    res.status(500).json({ error: "שגיאה בשרת" });
  }
});

//מחזירה פרטים של משתמש
// === GET /api/product/user/:id_number  (Admin only) ===
router.get("/user/:id_number", ensureAdmin, async (req, res) => {
  const { id_number } = req.params;

  try {
    const conn = await db.getConnection();
    const [rows] = await conn.execute(
      `
      SELECT
        u.id                    AS id,            -- ✅ מזהה פנימי להצגה ב-AdminUserDetails
        u.id_number            AS id_number,
        u.first_name           AS first_name,
        u.last_name            AS last_name,
        u.email                AS email,
        u.phone                AS phone,         -- ✅ מציגים ב-AdminUserDetails
        u.role                 AS role,          -- ✅ מציגים ב-AdminUserDetails
        u.status               AS status,        -- ✅ מציגים ב-AdminUserDetails
        u.country              AS country,       -- ✅ בלוק "כתובת"
        u.city                 AS city,
        u.street               AS street,
        u.house_number         AS house_number,
        u.apartment_number     AS apartment_number,
        u.zip                  AS zip,
        u.id_card_photo        AS id_card_photo, -- ✅ בלוק "תמונות"
        u.profile_photo        AS profile_photo,
        u.delivery_options     AS delivery_options, -- ✅ אם קיים אצלך
        u.registered           AS registered     -- ✅ נרשם: תאריך
      FROM users u
      WHERE u.id_number = ?
      LIMIT 1
      `,
      [id_number]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "משתמש לא נמצא" });
    }

    return res.json({ success: true, user: rows[0] });
  } catch (e) {
    console.error("GET /api/users/user/:id_number error:", e);
    return res.status(500).json({ success: false, message: "DB error" });
  }
});


module.exports = router;
