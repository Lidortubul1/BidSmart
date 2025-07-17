const express = require("express");
const router = express.Router();
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey:
    "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", // כאן תכתבי את ה־API שלך
});

router.post("/", async (req, res) => {
  const { message } = req.body;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: message }],
    });

    res.json({ reply: completion.choices[0].message.content });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "שגיאה בשרת AI" });
  }
});

module.exports = router;
