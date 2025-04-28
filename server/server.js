const express = require("express");
const cors = require("cors");

// שים לב: products (ברבים)
const productRoutes = require("./products");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// זה בסדר
app.use("/api/product", productRoutes);

const db = require("./database");
db.getConnection();

// const bcrypt = require("bcrypt"); // אם בעתיד תשתמש בסיסמאות מוצפנות, לא חובה כרגע
app.post("/api/login", async (req, res) => {
  const email = req.body.email.trim();
  const password = req.body.password.trim();

  try {
    const connection = await db.getConnection();
    const [rows] = await connection.execute(
      "SELECT * FROM users WHERE email = ? AND password = ?",
      [email, password]
    );

    if (rows.length > 0) {
      res.json({ success: true });
    } else {
      res.json({ success: false });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "שגיאה בשרת" });
  }
});

app.post("/api/register", async (req, res) => {
  /* ... */
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
