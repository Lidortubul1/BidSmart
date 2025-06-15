const express = require("express");
const session = require("express-session");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const productRoutes = require("./products.js");
const authRoutes = require("./auth");
const quotationRoutes = require("./quotation");
const categoryRoutes = require("./categories.js");
const saleRoutes = require("./sale.js");
const { setupSocket } = require("./socketManager.js");
const userRoutes = require("./users");

const db = require("./database.js");
const paymentRoutes = require("./payment");
const { checkIsLiveProducts } = require("./liveChecker.js");
const { checkUnpaidWinners } = require("./saleChecker");
const { notifyUpcomingAuctions } = require("./liveChecker");




const app = express();
const PORT = 5000;
const server = http.createServer(app);
// קונפיגורציית Express
app.use(express.json());


const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// הגדרת socket.io
setupSocket(io);

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

app.use(
  session({
    secret: "my_secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

app.use("/uploads", express.static("uploads"));

app.use("/api/product", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/quotation", quotationRoutes);
app.use("/api/sale", saleRoutes);
app.use("/api/payment", paymentRoutes);//PAYPAL תשלום
app.use("/api/users", userRoutes);

// בדיקת חיבור למסד הנתונים
db.getConnection().then((conn) => {
  conn.query("SELECT DATABASE() AS db").then(([rows]) => {
    console.log("מחובר למסד:", rows[0].db);
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});



//משנה את המכירה לפעילה ברגע שהתאריך והשעה מגיעים
setInterval(() => {
  checkIsLiveProducts();
}, 10000); // בודק כל 10 שניות

//מדפיס אם משתמש לא שילם כל 12 שעות
setInterval(() => {
  checkUnpaidWinners();
}, 12 * 60 * 60 * 1000); // כל 12 שעות


// בדיקה כל דקה על מכירות שמתחילות בעוד 10 דקות (ושולחות התראה למשתתפים)
setInterval(() => {
  notifyUpcomingAuctions(); // מייבא מ־liveChecker
}, 60000); // כל דקה
