//שמות תכנתים: לידור טבול ולילי ויינר
const express = require("express"); // ייבוא ספריות וקבצים
const session = require("express-session"); //הספרייה שמריצה את שרת ה-API
const cors = require("cors"); //מאפשרת לשמור session של משתמש
//מאפשר ל־Frontend לשלוח בקשות לשרת
const http = require("http"); //http יוצר שרת רגיל
const { Server } = require("socket.io"); //socket.io מאפשר תקשורת בזמן אמת (Live Auction)
//ייבוא קבצי ראוטים ופונקציות עזר HTTP
const productRoutes = require("./products.js");
const authRoutes = require("./auth");
const quotationRoutes = require("./quotation");
const categoryRoutes = require("./categories.js");
const saleRoutes = require("./sale.js");
const userRoutes = require("./users");
const paymentRoutes = require("./payment");
const adminRoutes = require("./admin.js");
const acutionRoutes= require("./auction.js")
//מנהל ה (Real-time) עם המשתמשים דרך socket.io
const { setupSocket } = require("./socketManager.js");
const sellerRoutes = require("./seller.js");
const ContactsRoutes = require("./contacts.js");

const db = require("./database.js");
//פונקציות שרצות באופן קבוע אוטומטית
const { checkIsLiveProducts, notifyUpcomingAuctions,closeExpiredAuctions } = require("./liveChecker.js");
const { checkUnpaidWinners } = require("./saleChecker"); //כל 12 שעות לבדוק מי זכה ועדיין לא שילם
require("dotenv").config();
console.log("Loaded API KEY:", process.env.OPENAI_API_KEY);

const aiChatRoutes = require("./aiChat.js");

const app = express(); // יצירת אפליקציית אקספרס חדשה
const PORT = 5000; // הגדרת פורט להרצת השרת
const server = http.createServer(app); // יצירת שרת HTTP עם אקספרס

// קונפיגורציית Express – מאפשרת ניתוח JSON בבקשות
app.use(express.json());
// הגדרת socket.io עם הרשאות CORS לקליינט בריאקט


// מאפשר להוסט 3000 לשלוח בקשות לשרת cors-
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

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // כתובת הפרונט
    methods: ["GET", "POST"], // שיטות מותרים
    credentials: true, // מאפשר שליחת עוגיות
  },
});

// הפעלת המאזין של WebSocket ומעבר ניהול לאובייקט socketManager
setupSocket(io);

//שימוש בstatic
// חשיפת תיקיית התמונות לצפייה בדפדפן דרך /uploads
app.use("/uploads", express.static("uploads"));
app.use("/api/seller", sellerRoutes);//ניהול מוצרים של מוכר
// רישום כל הנתיבים (ראוטים) עם prefix מתאים לפי נושא
app.use("/api/product", productRoutes); // מוצר
app.use("/api/categories", categoryRoutes); // קטגוריות
app.use("/api/auth", authRoutes); // התחברות והרשמה
app.use("/api/quotation", quotationRoutes); // הצעות מחיר
app.use("/api/sale", saleRoutes); // מכירה וזכיות
app.use("/api/admin", adminRoutes); // ניהול מוצרים
app.use("/api/payment", paymentRoutes); // תשלומים דרך PayPal
app.use("/api/users", userRoutes); // משתמשים ופרופילים
app.use("/api/auction",acutionRoutes); // מכירה פומבית
app.use("/api/contacts", ContactsRoutes); // צור קשר

app.use("/api/ai-chat", aiChatRoutes);//נציגת AI
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
setInterval(() => { checkIsLiveProducts(io); }, 10000);

// כל 12 שעות בודק אם יש זוכים שלא שילמו בזמן – שולח מיילים או הודעות
setInterval(() => {
  checkUnpaidWinners();
}, 12 * 60 * 60 * 1000); // כל 12 שעות

// כל דקה בודק אם יש מכירה שמתחילה עוד 10 דקות – שולח התראה למשתתפים שנרשמו
setInterval(() => { notifyUpcomingAuctions(); }, 60000);


setInterval(() => closeExpiredAuctions(io), 60_000);
