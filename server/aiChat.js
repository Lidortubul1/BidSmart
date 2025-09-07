//server\aiChat.js
// צ'אט AI: קבלת הודעה מהמשתמש, שליחה ל־OpenAI עם הקשר קבוע, וקבלת תשובה חכמה מהמודל.

const express = require("express");
const router = express.Router();
const OpenAI = require("openai");
require("dotenv").config();
const context = require("./config/aiContext");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});



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
