const express = require("express");
const cors = require("cors");
const productRoutes = require("./products");
const authRoutes = require("./auth");
const db = require("./database");

const app = express();
const PORT = 5000;

app.use(cors());

// ✅ קודם JSON רק ל־auth
app.use("/api", express.json(), authRoutes);

// ✅ ואז ראוט שמקבל קבצים – בלי express.json
app.use("/api/product", productRoutes);

db.getConnection();

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
