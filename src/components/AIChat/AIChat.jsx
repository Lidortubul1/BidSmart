import { useState } from "react";
import axios from "axios";
import styles from "./AIChat.module.css";

export default function AIChat() {
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const handleSend = async () => {
    if (!userInput.trim()) return;
    const userMessage = { role: "user", text: userInput };
    setMessages((prev) => [...prev, userMessage]);
    setUserInput("");

    const res = await axios.post("http://localhost:5000/api/ai-chat", {
      message: userInput,
    });
    const aiMessage = { role: "ai", text: res.data.reply };
    setMessages((prev) => [...prev, aiMessage]);
  };

  return (
    <div className={styles.chatWrapper}>
      {isOpen ? (
        <div className={styles.chatBox}>
          <div className={styles.header}>
            <span>AI נציגת</span>
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
              placeholder="כתוב שאלה לנציג..."
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
