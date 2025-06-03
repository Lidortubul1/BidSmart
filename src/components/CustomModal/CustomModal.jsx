import styles from "./CustomModal.module.css";
import { useState, useEffect } from "react";

export default function CustomModal({
  onClose,
  onLogin,
  onRegister,
  onForgotPassword,
  visible,
  title,
  message,
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // איפוס השדות בכל פתיחה
  useEffect(() => {
    if (visible) {
      setEmail("");
      setPassword("");
    }
  }, [visible]);

  if (!visible) return null;

  const handleOverlayClick = () => {
    onClose?.();
  };

  const handleContentClick = (e) => {
    e.stopPropagation();
  };

  return (
    <div className={styles.modalOverlay} onClick={handleOverlayClick}>
      <div className={styles.modalContent} onClick={handleContentClick}>
        <button className={styles.closeButton} onClick={onClose}>
          ×
        </button>

        <h2 className={styles.title}>{title || "התחברות נדרשת"}</h2>
        <p className={styles.message}>
          {message || "עליך להתחבר על מנת להירשם למכירת מוצר זה"}
        </p>

        <input
          type="email"
          placeholder="אימייל"
          className={styles.input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="סיסמה"
          className={styles.input}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className={styles.actions}>
          <button className={styles.linkButton} onClick={onForgotPassword}>
            שכחת את הסיסמה?
          </button>
          <button className={styles.registerButton} onClick={onRegister}>
            להרשמה
          </button>
          <button
            className={styles.loginButton}
            onClick={() => onLogin(email, password)}
          >
            התחברות
          </button>
        </div>
      </div>
    </div>
  );
}
