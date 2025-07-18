const express = require("express");
const router = express.Router();
const OpenAI = require("openai");
require("dotenv").config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const context = `
אתה נציג AI של אתר BidSmart.
מטרתך היא לענות לשאלות המשתמשים רק בנוגע לאתר, בצורה אדיבה, ברורה וקצרה.
אל תענה על נושאים שאינם קשורים לאתר.
תענה בתשובות קצרות- עד 2 שורות פחות או יותר

מידע חשוב:
- אתר BidSmart הוא אתר מכירות פומביות.
- מוכר יכול להוסיף מוצר דרך 'הוסף מוצר'.
- מכירה פומבית מתחילה בזמן שנקבע מראש בדף המוצר.
- קונים מציעים הצעות מחיר בלייב דרך דף המוצר.
- קונה שזכה במוצר משלם דרך PayPal בדף 'ההצעות שלי'.
- מוכר מסמן מוצר שנשלח או נמסר דרך 'ניהול מוצרים'.
- קונה רואה את הסטטוס בדף 'ההצעות שלי'.
- פרופיל אישי ופרטי כתובת ניתן לערוך בפרופיל.
- ניתן לשאול אותך כל שאלה על האתר.
- אם מישהו שואל שאלה לא קשורה, תגיד: 'אני יכול לעזור רק בשאלות על אתר BidSmart'.

תענה תמיד בעברית פשוטה.
`;

router.post("/", async (req, res) => {
  const { message } = req.body;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: context },
        { role: "user", content: message },
      ],
    });

    res.json({ reply: completion.choices[0].message.content });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "שגיאה בשרת AI" });
  }
});

module.exports = router;
