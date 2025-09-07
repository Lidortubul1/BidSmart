// src/pages/ResetPassword/ResetPasswordPage.jsx
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { resetPassword } from "../../services/authApi";
import styles from "./ResetPasswordPage.module.css";

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // תואם לשרת: 6+ תווים, אות ומספר
  const validatePassword = (password) =>
    password.length >= 6 && /[A-Za-z]/.test(password) && /\d/.test(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    setError("");

    if (!validatePassword(newPassword)) {
      return setError("הסיסמה חייבת להכיל לפחות 6 תווים, אותיות ומספרים");
    }
    if (newPassword !== confirmPassword) {
      return setError("אימות הסיסמה נכשל");
    }

    try {
      setIsLoading(true);
      const res = await resetPassword(token, newPassword); // מחזיר response.data
      if (res?.success) {
        setSuccess(true);
        setTimeout(() => navigate("/login"), 2500);
      } else {
        setError(res?.message || "שגיאה");
      }
    } catch (err) {
      setError(err?.response?.data?.message || "שגיאה בשרת");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles["rp-container"]}>
      <div className={styles["rp-card"]}>
        <h1 className={styles["rp-title"]}>איפוס סיסמה</h1>
        <p className={styles["rp-subtitle"]}>
          הזן/י סיסמה חדשה ואשר/י אותה. הדרישות: לפחות 6 תווים, אות ומספר.
        </p>

        <form onSubmit={handleSubmit} className={styles["rp-form"]} noValidate>
          {/* סיסמה חדשה */}
          <div className={styles["rp-field"]}>
            <label className={styles["rp-label"]} htmlFor="rp-new">
              סיסמה חדשה
            </label>

            <div className={styles["rp-inputWrap"]}>
              <input
                id="rp-new"
                type={showNew ? "text" : "password"}
                className={`${styles["rp-input"]} ${styles["rp-input--withEye"]}`}
                placeholder="••••••"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                aria-invalid={Boolean(error)}
                aria-describedby="rp-status"
              />

              <button
                type="button"
                className={styles["rp-eyeBtn"]}
                aria-label={showNew ? "הסתר סיסמה" : "הצג סיסמה"}
                aria-pressed={showNew}
                onClick={() => setShowNew((v) => !v)}
                title={showNew ? "הסתר סיסמה" : "הצג סיסמה"}
              >
                {/* Eye / Eye-off SVG */}
                {showNew ? (
                  <svg className={styles["rp-eyeIcon"]} viewBox="0 0 24 24">
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"></path>
                    <path d="M12 9a3 3 0 100 6 3 3 0 000-6z"></path>
                    <line x1="4" y1="4" x2="20" y2="20" />
                  </svg>
                ) : (
                  <svg className={styles["rp-eyeIcon"]} viewBox="0 0 24 24">
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* אימות סיסמה */}
          <div className={styles["rp-field"]}>
            <label className={styles["rp-label"]} htmlFor="rp-confirm">
              אימות סיסמה
            </label>

            <div className={styles["rp-inputWrap"]}>
              <input
                id="rp-confirm"
                type={showConfirm ? "text" : "password"}
                className={`${styles["rp-input"]} ${styles["rp-input--withEye"]}`}
                placeholder="••••••"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />

              <button
                type="button"
                className={styles["rp-eyeBtn"]}
                aria-label={showConfirm ? "הסתר סיסמה" : "הצג סיסמה"}
                aria-pressed={showConfirm}
                onClick={() => setShowConfirm((v) => !v)}
                title={showConfirm ? "הסתר סיסמה" : "הצג סיסמה"}
              >
                {showConfirm ? (
                  <svg className={styles["rp-eyeIcon"]} viewBox="0 0 24 24">
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"></path>
                    <path d="M12 9a3 3 0 100 6 3 3 0 000-6z"></path>
                    <line x1="4" y1="4" x2="20" y2="20" />
                  </svg>
                ) : (
                  <svg className={styles["rp-eyeIcon"]} viewBox="0 0 24 24">
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>

            <div className={styles["rp-hint"]}>יש להקליד את אותה סיסמה פעמיים.</div>
          </div>

          <div id="rp-status" className={styles["rp-status"]} aria-live="polite">
            {error && <p className={styles["rp-error"]}>{error}</p>}
            {success && (
              <p className={styles["rp-success"]}>
                הסיסמה עודכנה בהצלחה! מעביר/ה למסך התחברות…
              </p>
            )}
          </div>

          <div className={styles["rp-actions"]}>
            <button type="submit" className={styles["rp-button"]} disabled={isLoading}>
              {isLoading ? "שומר/ת…" : "שמור סיסמה חדשה"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
