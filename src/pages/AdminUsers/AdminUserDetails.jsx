import { useEffect, useState } from "react";
import { getUserById } from "../../services/adminApi";
import styles from "./AdminUsers.module.css";

/**
 * props:
 *  - userId: number (חובה)
 *  - onClose?: () => void
 */
export default function AdminUserDetails({ userId, onClose }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getUserById(userId);
        setUser(data || null);
      } catch (e) {
        console.error(e);
        setError("שגיאה בטעינת פרטי המשתמש");
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  return (
    <div className={styles.auDetails_wrap}>
      <div className={styles.auDetails_header}>
        <h3 className={styles.au_title}>פרטי משתמש</h3>
        {onClose && (
          <button className={styles.au_btn} onClick={onClose}>
            סגור
          </button>
        )}
      </div>

      {loading && <div className={styles.au_state}>טוען…</div>}
      {error && <div className={styles.au_error}>{error}</div>}

      {!loading && !error && user && (
        <div className={styles.au_grid}>
          <div className={styles.au_card}>
            <h4>פרטים בסיסיים</h4>
            <div className={styles.au_field}>
              <span>מזהה:</span>
              <b>{user.id}</b>
            </div>
            <div className={styles.au_field}>
              <span>ת״ז:</span>
              <b>{user.id_number || "-"}</b>
            </div>
            <div className={styles.au_field}>
              <span>שם:</span>
              <b>
                {[user.first_name, user.last_name].filter(Boolean).join(" ") ||
                  "-"}
              </b>
            </div>
            <div className={styles.au_field}>
              <span>דוא״ל:</span>
              <b>{user.email || "-"}</b>
            </div>
            <div className={styles.au_field}>
              <span>טלפון:</span>
              <b>{user.phone || "-"}</b>
            </div>
            <div className={styles.au_field}>
              <span>תפקיד:</span>
              <b>{user.role}</b>
            </div>
            <div className={styles.au_field}>
              <span>סטטוס:</span>
              <b>{user.status}</b>
            </div>
            <div className={styles.au_field}>
              <span>נרשם:</span>
              <b>
                {user.registered
                  ? new Date(user.registered).toLocaleString("he-IL")
                  : "-"}
              </b>
            </div>
            {"rating" in user && (
              <div className={styles.au_field}>
                <span>דירוג:</span>
                <b>{user.rating ?? "-"}</b>
              </div>
            )}
          </div>

          <div className={styles.au_card}>
            <h4>כתובת</h4>
            <div className={styles.au_field}>
              <span>מדינה:</span>
              <b>{user.country || "-"}</b>
            </div>
            <div className={styles.au_field}>
              <span>עיר:</span>
              <b>{user.city || "-"}</b>
            </div>
            <div className={styles.au_field}>
              <span>רחוב:</span>
              <b>{user.street || "-"}</b>
            </div>
            <div className={styles.au_field}>
              <span>מס׳ בית:</span>
              <b>{user.house_number || "-"}</b>
            </div>
            <div className={styles.au_field}>
              <span>דירה:</span>
              <b>{user.apartment_number || "-"}</b>
            </div>
            <div className={styles.au_field}>
              <span>מיקוד:</span>
              <b>{user.zip || "-"}</b>
            </div>
          </div>

          <div className={styles.au_card}>
            <h4>תמונות</h4>
            <div className={styles.au_field}>
              <span>תמונת ת״ז:</span>
              <b>{user.id_card_photo ? "קיים" : "—"}</b>
            </div>
            <div className={styles.au_field}>
              <span>תמונת פרופיל:</span>
              <b>{user.profile_photo ? "קיים" : "—"}</b>
            </div>
          </div>

          <div className={styles.au_card}>
            <h4>העדפות משלוח</h4>
            <div className={styles.au_field}>
              <span>אפשרויות:</span>
              <b>{user.delivery_options || "-"}</b>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
