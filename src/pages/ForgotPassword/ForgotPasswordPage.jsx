import { useState } from "react";
import styles from "./ForgotPasswordPage.module.css";
import axios from "axios";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      const res = await axios.post(
        "http://localhost:5000/api/auth/forgot-password",
        { email }
      );

      if (res.data.success) {
        setMessage("קישור לאיפוס סיסמה נשלח למייל");
      } else {
        setError(res.data.message || "שגיאה בשליחה");
      }
    } catch (err) {
      setError("שגיאה בשליחת מייל");
    }
  };

  return (
    <div className={styles.container}>
      <h2>שכחת סיסמה?</h2>
      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          type="email"
          placeholder="הזן את כתובת האימייל שלך"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit">שלח קישור לאיפוס</button>
        {message && <p className={styles.success}>{message}</p>}
        {error && <p className={styles.error}>{error}</p>}
      </form>
    </div>
  );
}
