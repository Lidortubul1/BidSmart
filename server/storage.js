// server/storage.js
//עם שם ייחודי uploads שמירת קבצים בתיקיית multer הגדרת אחסון

const multer = require("multer");
const path = require("path");
const fs = require("fs");

// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     const uploadPath = path.join(__dirname, "../uploads");

//     // יצירת התיקייה אם לא קיימת
//     if (!fs.existsSync(uploadPath)) {
//       fs.mkdirSync(uploadPath);
//     }
//     cb(null, uploadPath);
//   },
//   filename: function (req, file, cb) {
//     //data.now() - מספר המילישניות שחלפו מ1970
//     const uniqueName = Date.now() + "_" + file.originalname;
//     cb(null, uniqueName);
//   },
// });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    const name = Date.now() + "_" + Math.round(Math.random() * 1e9) + ext;
    cb(null, name);
  },
});

module.exports = storage;
