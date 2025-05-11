// LoginPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./LoginPage.module.css";
import axios from "axios";
import { useAuth } from "../../auth/AuthContext";

function LoginPage({ isModal = false, redirectAfterLogin = "/" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      const response = await axios.post("http://localhost:5000/api/login", {
        email,
        password,
      });

      if (response.data.success) {
        const user = response.data.user;
        login(user);
        localStorage.setItem("user", JSON.stringify(user));
        navigate(redirectAfterLogin);
      } else {
        alert("אימייל או סיסמה לא נכונים");
      }
    } catch (error) {
      alert("שגיאה בהתחברות");
      console.error(error);
    }
  }

  return (
    <div className={isModal ? styles.modalContainer : styles.container}>
      <div className={styles.formContainer}>
        <h1 className={styles.title}>התחברות</h1>
        <form className={styles.form} onSubmit={handleSubmit}>
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
      </div>
    </div>
  );
}

export default LoginPage;
