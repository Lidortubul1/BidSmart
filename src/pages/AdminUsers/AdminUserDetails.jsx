// src/pages/AdminUsers/AdminUserDetails.jsx
import { useEffect, useState } from "react";              // Hooks לניהול state וטעינה
import { getUserById } from "../../services/adminApi";    // קריאת API לשליפת משתמש
import styles from "./AdminUsers.module.css";             // מודול CSS לעיצוב כרטיס פרטי המשתמש
import { useNavigate } from "react-router-dom";           // ניווט לעמוד פריטי המוכר

/**
 * AdminUserDetails
 * כרטיס פרטים מפורט למשתמש בודד, מוצג בתוך טבלת הניהול מתחת לשורה.
 *
 * props:
 *  - userId: number (חובה)       → מזהה פנימי של המשתמש בטבלת users (עמודת id)
 *  - onClose?: () => void         → פעולה לסגירת הכרטיס (כפתור "סגור" בראש הכרטיס)
 *  - onToggleStatus?: (user)      → פעולה להשבת/החזר משתמש (מטופל בהורה)
 *  - togglingId?: number | null   → מזהה המשתמש שבטוגל כרגע (להצגת "מבצע…")
 */
export default function AdminUserDetails({ userId, onClose, onToggleStatus, togglingId }) {
  // אובייקט המשתמש שנטען מהשרת (או null עד לטעינה)
  const [user, setUser] = useState(null);

  // דגלי מצב מסך: טעינה ושגיאה
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // הוק ניווט – לשימוש בכפתור "פתח דף פריטי המוכר"
  const navigate = useNavigate();

  // טעינת פרטי משתמש בכל פעם ש־userId משתנה
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

  // טוגל מקומי (עדכון אופטימי) + קריאה להורה בלי להעביר event
  const handleLocalToggle = (e) => {
    e?.stopPropagation(); // הגנה אם הכרטיס נמצא בתוך אלמנט לוחיץ
    if (!user) return;
    const next = user.status === "active" ? "blocked" : "active";
    setUser((prev) => (prev ? { ...prev, status: next } : prev)); // עדכון אופטימי להצגה
    onToggleStatus?.(user); // ההורה יעדכן את הרשימה ויבצע את ה-API
  };

  return (
    <div className={styles.auDetails_wrap}>
      {/* כותרת הכרטיס + כפתור סגירה אופציונלי */}
      <div className={styles.auDetails_header}>
        <h3 className={styles.au_title}>פרטי משתמש</h3>
        {onClose && (
          <button className={styles.au_btn} onClick={onClose}>
            סגור
          </button>
        )}
      </div>

      {/* מצבי ביניים/שגיאה */}
      {loading && <div className={styles.au_state}>טוען…</div>}
      {error && <div className={styles.au_error}>{error}</div>}

      {/* תוכן הכרטיס – מוצג רק אם אין טעינה/שגיאה ויש אובייקט משתמש */}
      {!loading && !error && user && (
        <div className={styles.au_grid}>
          {/* כרטיס: פרטים בסיסיים */}
          <div className={styles.au_card}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <h4>פרטים בסיסיים</h4>

              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                {/* ניווט לדף פריטי המוכר (דף מלא) – רק למוכר עם ת״ז */}
                {user.role === "seller" && user.id_number && (
                  <button
                    className={styles.au_btn}
                    onClick={() =>
                      navigate(`/admin/sellers/${user.id_number}/products`, {
                        state: {
                          sellerName: [user.first_name, user.last_name].filter(Boolean).join(" "),
                          sellerIdNumber: user.id_number,
                        },
                      })
                    }
                    title="פתיחת דף מלא של פריטי המוכר"
                  >
                    פתח דף פריטי המוכר
                  </button>
                )}

                {/* כפתור השבת/החזר למערכת */}
                <button
                  className={`${styles.au_actionBtn} ${
                    user.status === "active" ? styles.au_actionDanger : styles.au_actionOk
                  }`}
                  onClick={handleLocalToggle}
                  disabled={togglingId === user.id}
                  title={user.status === "active" ? "השבת משתמש (חסימה)" : "החזר משתמש למערכת"}
                >
                  {togglingId === user.id ? "מבצע…" : user.status === "active" ? "השבת" : "החזר למערכת"}
                </button>
              </div>
            </div>

            {/* זוגות שדה/ערך – מזהה פנימי, ת״ז, שם מלא, דוא״ל, טלפון, תפקיד, סטטוס, תאריך הרשמה */}
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
              <b>{[user.first_name, user.last_name].filter(Boolean).join(" ") || "-"}</b>
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
              <b>{user.registered ? new Date(user.registered).toLocaleString("he-IL") : "-"}</b>
            </div>

            {/* דירוג יוצג רק אם המשתמש אינו buyer ויש מפתח rating באובייקט */}
            {user.role !== "buyer" && "rating" in user && (
              <div className={styles.au_field}>
                <span>דירוג:</span>
                <b>{user.rating ?? "-"}</b>
              </div>
            )}
          </div>

          {/* כרטיס: כתובת */}
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

          {/* כרטיס: תמונות מזהה/פרופיל */}
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

          {/* כרטיס: העדפות משלוח – מוצג רק אם המשתמש אינו buyer */}
          {user.role !== "buyer" && (
            <div className={styles.au_card}>
              <h4>העדפות משלוח</h4>
              <div className={styles.au_field}>
                <span>אפשרויות:</span>
                <b>{user.delivery_options || "-"}</b>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
