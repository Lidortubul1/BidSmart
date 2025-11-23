// src\components\AIChat\AIChat.jsx
// ווידג'ט צ׳אט AI צף: פתיחה/סגירה, ניהול היסטוריית הודעות, שליחת שאלה לשרת וקבלת תשובת AI, ותצוגת קלט/שליחה למשתמש.

import { useState } from "react";
import axios from "axios";
import styles from "./AIChat.module.css";

// הוספת הודעת פתיחה ראשונית במקום מערך ריק
const initialMessages = [
  {
    role: "ai",
    text: "היי, אני רוז הנציגה החכמה של bidsmart. במה ניתן לעזור?",
  },
];

export default function AIChat() {
  // משתמשים במערך ההודעות ההתחלתי
  const [messages, setMessages] = useState(initialMessages);
  const [userInput, setUserInput] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const handleSend = async () => {
    if (!userInput.trim()) return;
    const userMessage = { role: "user", text: userInput };
    setMessages((prev) => [...prev, userMessage]);
    setUserInput("");

    try {
      // הוספת טיפול בשגיאות
      const res = await axios.post("http://localhost:5000/api/ai-chat", {
        message: userInput,
      });
      const aiMessage = { role: "ai", text: res.data.reply };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("שגיאה בשליחת הודעה לשרת:", error);
      const errorMessage = {
        role: "ai",
        text: "אני מצטערת, אירעה שגיאה בחיבור. נסה שוב מאוחר יותר.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  return (
    <div className={styles.chatWrapper}>
      {isOpen ? (
        <div className={styles.chatBox}>
          <div className={styles.header}>
            {/* שינוי שם הנציגה לשם שביקשת */}
            <span>
              <span role="img" aria-label="רובוט">
                🤖
              </span>
            AI רוז -נציגת
            </span>
            <button onClick={() => setIsOpen(false)}>✖️</button>
          </div>

          <div className={styles.messages}>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={msg.role === "user" ? styles.user : styles.ai}
              >
                {msg.text}
              </div>
            ))}
          </div>

          <div className={styles.inputArea}>
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="כתוב שאלה לרוז..."
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleSend();
                }
              }}
            />
            <button onClick={handleSend}>שלח</button>
          </div>
        </div>
      ) : (
        <button className={styles.chatToggle} onClick={() => setIsOpen(true)}>
          💬
        </button>
      )}
    </div>
  );
}