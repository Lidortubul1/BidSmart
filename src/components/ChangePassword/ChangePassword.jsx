import { useState } from "react";
import styles from "./ChangePassword.module.css";
import { changePassword } from "../../services/authApi";

export default function ChangePassword({ email, onClose, onSuccess }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false); // 🔒 נעילה

  const validatePassword = (password) => {
    const hasLetters = /[A-Za-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    return password.length >= 6 && hasLetters && hasNumbers;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return; // ⛔ מניעת שליחה כפולה
    setError("");
    setLoading(true); // 🔒 נועלים עם תחילת פעולה

    // בדיקות לקוח
    if (!validatePassword(newPassword)) {
      setError("הסיסמה החדשה חייבת להכיל לפחות 6 תווים, אותיות ומספרים");
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("אימות הסיסמה החדשה נכשל");
      setLoading(false);
      return;
    }

    try {
      const data = await changePassword(email, currentPassword, newPassword);
      console.log("🟢 change-password response:", data);

      if (!data.success) {
        setError(data.message || "שגיאה בשינוי הסיסמה");
        setLoading(false);
        return;
      }

      // ✅ הצלחה אמיתית
      onSuccess();
    } catch (err) {
      console.error("🔴 שינוי סיסמה נכשל:", err);
      setError("שגיאה כללית בשרת");
    } finally {
      setLoading(false); // שחרור נעילה תמיד
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
            disabled={loading}
          />
          <input
            type="password"
            placeholder="סיסמה חדשה"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            disabled={loading}
          />
          <input
            type="password"
            placeholder="אימות סיסמה חדשה"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={loading}
          />
          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            <button type="submit" disabled={loading}>
              {loading ? "שומר..." : "שנה סיסמה"}
            </button>
            <button type="button" onClick={onClose} disabled={loading}>
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
