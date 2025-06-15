const express = require("express");
const router = express.Router();
const db = require("./database");

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

module.exports = router;
