// src/components/LoginForm/LoginForm.jsx
import { useState } from "react";
import styles from "./LoginForm.module.css";
import { useAuth } from "../../auth/AuthContext";
import CustomModal from "../CustomModal/CustomModal";
import { loginUser } from "../../services/authApi.js"

export default function LoginForm({ onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();

  const [modalConfig, setModalConfig] = useState({
    show: false,
    title: "",
    message: "",
    confirmText: "סגור",
  });

  const showModal = (title, message) => {
    setModalConfig({
      show: true,
      title,
      message,
      confirmText: "סגור",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await loginUser(email, password); // ✅ שימוש בפונקציה החדשה

      if (response.success) {
        const user = response.user;
        login(user);
        localStorage.setItem("user", JSON.stringify(user));
        onSuccess?.(user);
      } else {
        showModal("שגיאה", "אימייל או סיסמה לא נכונים");
      }
    } catch (err) {
      showModal("שגיאה", "שגיאה בשרת, נסה שוב מאוחר יותר");
    }
  };

  return (
    <>
      <form className={styles.form} onSubmit={handleSubmit}>
        <h2 className={styles.title}>התחברות</h2>
        <input
          type="email"
          placeholder="אימייל"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={styles.input}
          required
        />
        <input
          type="password"
          placeholder="סיסמה"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={styles.input}
          required
        />
        <button type="submit" className={styles.button}>
          התחבר
        </button>
      </form>

      {modalConfig.show && (
        <CustomModal
          title={modalConfig.title}
          message={modalConfig.message}
          confirmText={modalConfig.confirmText}
          onConfirm={() => setModalConfig((prev) => ({ ...prev, show: false }))}
        />
      )}
    </>
  );
}
