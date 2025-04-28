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

app.post("/api/login", (req, res) => {
  /* ... */
});
app.post("/api/register", async (req, res) => {
  /* ... */
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
