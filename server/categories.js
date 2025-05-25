const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  // console.log("📦 נתיב /api/categories נקרא");

  const categories = {
    אלקטרוניקה: [
      "טלפונים",
      "מחשבים",
      "טלוויזיות",
      "מצלמות",
      "קונסולות משחק",
      "אביזרים",
      "שעון חכם",
    ],
    לבוש: ["נשים", "גברים", "ילדים", "נעליים", "אקססוריז"],
    ריהוט: ["סלון", "חדר שינה", "מטבח", "משרדי", "רהיטי גן"],
    לבית: ["כלי בית", "מנורות", "שטיחים", "עציצים", "ריהוט חוץ"],
    רכבים: ["רכב פרטי", "אופנועים", "אביזרי רכב", "צמיגים", "ג'אנטים"],
    ילדים: ["בגדי תינוקות", "עגלות", "משחקים", "מיטות תינוק"],
    ספורט: ["כושר", "מחנאות", "ציוד ספורט", "אופניים", "סקי וגלישה"],
    משרדי: ["מחשבים", "מסכים", "מדפסות", "מקלדות", "כיסאות משרד"],
    משחקים: ["משחקי מחשב", "משחקי קופסא", "משחקי היגיון", "משחקי אינטראקציה",],
  };
  

  res.json(categories);
});

module.exports = router;
