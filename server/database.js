// database.js

const mysql = require("mysql2/promise");

// משתנה שישמור את החיבור למסד הנתונים
let connection = null;

// פונקציה שמתחברת למסד הנתונים במידת הצורך
async function connectDatabase() {
  if (!connection) {
    // יצירת חיבור חדש  אם אין חיבור קיים
    connection = await mysql.createConnection({
      host: "localhost",
      user: "root", // שם המשתמש במסד הנתונים
      database: "bidsmart", // שם מסד הנתונים
    });

    console.log("Connected to MySQL database."); // הודעת התחברות מוצלחת
  }

  return connection; // החזרת החיבור למסד הנתונים
}

// פונקציה לרישום משתמש חדש
async function register(email, password) {
  console.log("Registering user..."); // הדפסת הודעה בזמן הרישום
  const db = await connectDatabase(); // התחברות למסד הנתונים

  // ביצוע שאילתת הוספה לטבלת users
  await db.execute(`INSERT INTO users (email, password) VALUES (?, ?)`, [
    email,
    password,
  ]);

  return true; // החזרת true לאחר רישום מוצלח
}

// ייצוא הפונקציות לשימוש בקבצים אחרים
module.exports = {
  register: register, // ייצוא פונקציית register
  getConnection: connectDatabase, // ייצוא פונקציית התחברות למסד הנתונים
};
