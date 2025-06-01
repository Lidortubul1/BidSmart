import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import styles from "./ResetPasswordPage.module.css";

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const validatePassword = (password) => {
    return (
      password.length >= 6 && /[A-Za-z]/.test(password) && /\d/.test(password)
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validatePassword(newPassword)) {
      return setError("הסיסמה חייבת להכיל לפחות 6 תווים, אותיות ומספרים");
    }

    if (newPassword !== confirmPassword) {
      return setError("אימות הסיסמה נכשל");
    }

    try {
      const res = await axios.post(
        "http://localhost:5000/api/auth/reset-password",
        {
          token,
          newPassword,
        }
      );

      if (res.data.success) {
        setSuccess(true);
        setTimeout(() => navigate("/login"), 3000);
      } else {
        setError(res.data.message || "שגיאה");
      }
    } catch (err) {
      setError("שגיאה בשרת");
    }
  };

  return (
    <div className={styles.container}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <h2>איפוס סיסמה</h2>
        <input
          type="password"
          placeholder="סיסמה חדשה"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="אימות סיסמה"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        {error && <p className={styles.error}>{error}</p>}
        {success && <p className={styles.success}>הסיסמה שונתה בהצלחה!</p>}
        <button type="submit">שמור סיסמה חדשה</button>
      </form>
    </div>
  );
}
