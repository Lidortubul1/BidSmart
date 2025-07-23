const express = require("express");
const router = express.Router();
const db = require("./database");

// router.get("/", (req, res) => {
//   // console.log("📦 נתיב /api/categories נקרא");

//   const categories = {
//     אלקטרוניקה: [
//       "טלפונים",
//       "מחשבים",
//       "טלוויזיות",
//       "מצלמות",
//       "קונסולות משחק",
//       "אביזרים",
//       "שעון חכם",
//     ],
//     לבוש: ["נשים", "גברים", "ילדים", "נעליים", "אקססוריז"],
//     ריהוט: ["סלון", "חדר שינה", "מטבח", "משרדי", "רהיטי גן"],
//     לבית: ["כלי בית", "מנורות", "שטיחים", "עציצים", "ריהוט חוץ"],
//     רכבים: ["רכב פרטי", "אופנועים", "אביזרי רכב", "צמיגים", "ג'אנטים"],
//     ילדים: ["בגדי תינוקות", "עגלות", "משחקים", "מיטות תינוק"],
//     ספורט: ["כושר", "מחנאות", "ציוד ספורט", "אופניים", "סקי וגלישה"],
//     משרדי: ["מחשבים", "מסכים", "מדפסות", "מקלדות", "כיסאות משרד"],
//     משחקים: ["משחקי מחשב", "משחקי קופסא", "משחקי היגיון", "משחקי אינטראקציה",],
//   };
  

//   res.json(categories);
// });



//שליפת כל הקטגוריות ותת קטגוריות מהטבלאות
// שליפת קטגוריות עם תתי־קטגוריות לממשק משתמש


//



//שליפת כל הקטגוריות עם תתי קטגוריות
router.get("/category-with-subs", async (req, res) => {
  const conn = await db.getConnection();
  const [categories] = await conn.query("SELECT * FROM categories");
  const [subcategories] = await conn.query("SELECT * FROM subcategories");
  
  const result = categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    subcategories: subcategories
      .filter((sub) => sub.category_id === cat.id)
      .map((sub) => ({ id: sub.id, name: sub.name })),
  }));
  res.json(result);
});



module.exports = router;
