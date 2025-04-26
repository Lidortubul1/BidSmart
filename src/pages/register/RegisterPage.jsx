import { useState } from "react";
import { registerUser } from "../../services/api";
import styles from "./RegisterPage.module.css";

function RegisterPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const result = await registerUser(firstName, lastName, email, password);
      if (result.success) {
        setMessage("נרשמת בהצלחה!");
      } else {
        setMessage("שגיאה: " + result.message);
      }
    } catch (error) {
      setMessage("אירעה שגיאה בשרת");
    }
  };

  return (
    <div className={styles.container}>
      <h1>הרשמה</h1>
      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          type="text"
          placeholder="שם פרטי"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="שם משפחה"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          required
        />
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
        <button type="submit">הרשמה</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
}

export default RegisterPage;
