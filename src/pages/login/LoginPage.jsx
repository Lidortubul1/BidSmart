import { useState } from "react";
import { loginUser } from "../../services/api";
import styles from "./LoginPage.module.css";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const result = await loginUser(email, password);
      if (result.success) {
        setMessage("התחברת בהצלחה!");
      } else {
        setMessage("שגיאה: " + result.message);
      }
    } catch (error) {
      setMessage("אירעה שגיאה בשרת");
    }
  };

  return (
    <div className={styles.container}>
      <h1>התחברות</h1>
      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          type="email"
          placeholder="אימייל"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="סיסמה"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">התחבר</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
}

export default LoginPage;
