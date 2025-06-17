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




// ייצוא הפונקציות לשימוש בקבצים אחרים
module.exports = {
  getConnection: connectDatabase, // ייצוא פונקציית התחברות למסד הנתונים
};
