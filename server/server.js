//שמות תכנתים: לידור טבול ולילי וינר
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




const app = express(); // יצירת אפליקציית אקספרס חדשה
const PORT = 5000; // הגדרת פורט להרצת השרת
const server = http.createServer(app); // יצירת שרת HTTP עם אקספרס

// קונפיגורציית Express – מאפשרת ניתוח JSON בבקשות
app.use(express.json());

// הגדרת socket.io עם הרשאות CORS לקליינט בריאקט
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // כתובת הפרונט
    methods: ["GET", "POST"], // שיטות מותרים
    credentials: true, // מאפשר שליחת עוגיות
  },
});

// הפעלת המאזין של WebSocket ומעבר ניהול לאובייקט socketManager
setupSocket(io);

// הגדרת CORS כדי לאפשר תקשורת עם קליינט מהדומיין של ריאקט
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

// קונפיגורציה לניהול session באמצעות עוגייה (cookie)
app.use(
  session({
    secret: "my_secret_key", // מפתח סודי להצפנה
    resave: false, // לא לשמור session אם אין שינוי
    saveUninitialized: false, // לא ליצור session ריק
    cookie: {
      secure: false, // לא מחייב https
      httpOnly: true, // הגבלת גישה לעוגייה לצד השרת בלבד
      maxAge: 1000 * 60 * 60 * 24, // תוקף של 24 שעות
    },
  })
);
//שימוש בstatic
// חשיפת תיקיית התמונות לצפייה בדפדפן דרך /uploads
app.use("/uploads", express.static("uploads"));

// רישום כל הנתיבים (ראוטים) עם prefix מתאים לפי נושא
app.use("/api/product", productRoutes); // מוצר
app.use("/api/categories", categoryRoutes); // קטגוריות
app.use("/api/auth", authRoutes); // התחברות והרשמה
app.use("/api/quotation", quotationRoutes); // הצעות מחיר
app.use("/api/sale", saleRoutes); // מכירה וזכיות
app.use("/api/payment", paymentRoutes); // תשלומים דרך PayPal
app.use("/api/users", userRoutes); // משתמשים ופרופילים

// בדיקת חיבור למסד הנתונים והדפסת שם הדאטהבייס
db.getConnection().then((conn) => {
  conn.query("SELECT DATABASE() AS db").then(([rows]) => {
    console.log("מחובר למסד:", rows[0].db);
  });
});

// הפעלת השרת להאזנה על הפורט שנבחר
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// מריץ את הפונקציה שבודקת אילו מוצרים אמורים להפוך ל"לייב"
setInterval(() => {
  checkIsLiveProducts();
}, 10000); // כל 10 שניות

// כל 12 שעות בודק אם יש זוכים שלא שילמו בזמן – שולח מיילים או הודעות
setInterval(() => {
  checkUnpaidWinners();
}, 12 * 60 * 60 * 1000); // כל 12 שעות

// כל דקה בודק אם יש מכירה שמתחילה עוד 10 דקות – שולח התראה למשתתפים שנרשמו
setInterval(() => {
  notifyUpcomingAuctions(); 
}, 60000); // כל דקה
