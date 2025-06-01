import { useState } from "react";
import styles from "./ChangePassword.module.css";
import axios from "axios";

export default function ChangePassword({ email, onClose, onSuccess }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const validatePassword = (password) => {
    const hasLetters = /[A-Za-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    return password.length >= 6 && hasLetters && hasNumbers;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validatePassword(newPassword)) {
      return setError("הסיסמה החדשה חייבת להכיל לפחות 6 תווים, אותיות ומספרים");
    }

    if (newPassword !== confirmPassword) {
      return setError("אימות הסיסמה החדשה נכשל");
    }

    try {
      const res = await axios.put(
        "http://localhost:5000/api/auth/change-password",
        {
          email,
          currentPassword,
          newPassword,
        },
        { withCredentials: true }
      );

      if (res.data.success) {
        onSuccess();
      } else {
        setError(res.data.message || "שגיאה בשינוי הסיסמה");
      }
    } catch (err) {
      console.error(err);
      setError("שגיאה בשרת");
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2>שינוי סיסמה</h2>
        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="password"
            placeholder="סיסמה נוכחית"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="סיסמה חדשה"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="אימות סיסמה חדשה"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.actions}>
            <button type="submit">שנה סיסמה</button>
            <button type="button" onClick={onClose}>
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
