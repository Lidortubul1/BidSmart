import { useState } from "react";
import styles from "./ForgotPasswordPage.module.css";
import { sendResetPasswordEmail } from "../../services/authApi";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    setMessage("");
    setError("");

    const trimmed = email.trim();
    if (!trimmed) {
      setError("אנא הזן/י כתובת אימייל");
      return;
    }

    try {
      setIsLoading(true);
      const res = await sendResetPasswordEmail(trimmed);
      if (res?.data?.success) {
        setMessage("קישור לאיפוס סיסמה נשלח למייל.");
        setEmail("");
      } else {
        setError(res?.data?.message || "אירעה שגיאה בעת שליחת המייל.");
      }
    } catch (err) {
      setError("אירעה שגיאה בעת שליחת המייל.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles["fp-container"]}>
      <div className={styles["fp-card"]}>
        <h1 className={styles["fp-title"]}>שכחת סיסמה?</h1>
        <p className={styles["fp-subtitle"]}>
          הזן/י את כתובת האימייל שלך ונשלח לך קישור לאיפוס סיסמה.
        </p>

        <form className={styles["fp-form"]} onSubmit={handleSubmit} noValidate>
          <div className={styles["fp-field"]}>
            <label className={styles["fp-label"]} htmlFor="fp-email">
              אימייל
            </label>
            <input
              id="fp-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="name@example.com"
              className={styles["fp-input"]}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(error)}
              aria-describedby="fp-hint fp-status"
              required
            />
            <div id="fp-hint" className={styles["fp-hint"]}>
              נשלח רק אם הכתובת קיימת במערכת.
            </div>
          </div>

          <div className={styles["fp-actions"]}>
            <button
              type="submit"
              className={styles["fp-button"]}
              disabled={isLoading}
            >
              {isLoading ? "שולח..." : "שלח קישור לאיפוס"}
            </button>
          </div>

          <div id="fp-status" className={styles["fp-status"]} aria-live="polite">
            {message && <p className={styles["fp-success"]}>{message}</p>}
            {error && <p className={styles["fp-error"]}>{error}</p>}
          </div>
        </form>
      </div>
    </div>
  );
}
