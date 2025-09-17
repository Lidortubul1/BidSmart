import { useEffect, useState } from "react";
import { getUserById } from "../../services/adminApi";
import styles from "./AdminUsers.module.css";
import { useNavigate } from "react-router-dom";

/** כרטיס פרטי משתמש — ללא שינוי פונקציונלי */
export default function AdminUserDetails({ userId, onClose, onToggleStatus, togglingId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // === פורמט תצוגה ===
  const formatRole = (role) => {
    switch (String(role || "").toLowerCase()) {
      case "seller": return "משתמש מוכר";
      case "buyer":  return "משתמש רגיל";
      default:       return role || "-";
    }
  };

  const formatStatus = (status) => {
    switch (String(status || "").toLowerCase()) {
      case "active":  return "פעיל";
      case "blocked": return "חסום";
      default:        return status || "-";
    }
  };

  const formatDeliveryOptions = (val) => {
    const raw = String(val || "").toLowerCase().trim();
    if (!raw) return "-";

    // תמיכה בגרסאות שונות: "delivery+pickup", "delivery,pickup", "pickup+delivery", "delivery_and_pickup" וכו'
    const tokens = raw.split(/[^a-z]+/).filter(Boolean); // מפצל על כל תו שאינו אות
    const hasDelivery = tokens.includes("delivery");
    const hasPickup   = tokens.includes("pickup");

    if (hasDelivery && hasPickup) return "משלוח ואיסוף עצמי";
    if (hasDelivery)              return "משלוח";
    if (hasPickup)                return "איסוף עצמי";

    // ברירת מחדל אם הגיע ערך אחר
    return val;
  };

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

  const handleLocalToggle = (e) => {
    e?.stopPropagation();
    if (!user) return;
    const next = user.status === "active" ? "blocked" : "active";
    setUser((prev) => (prev ? { ...prev, status: next } : prev));
    onToggleStatus?.(user);
  };

  return (
    <div className={styles.adminUsersDetailsWrap}>
      <div className={styles.adminUsersDetailsHeader}>
        <h3 className={styles.adminUsersTitleSm}>פרטי משתמש</h3>
        {onClose && (
          <button className={styles.adminUsersBtn} onClick={onClose}>
            סגור
          </button>
        )}
      </div>

      {loading && <div className={styles.adminUsersState}>טוען…</div>}
      {error && <div className={styles.adminUsersError}>{error}</div>}

      {!loading && !error && user && (
        <div className={styles.adminUsersGrid}>
          <div className={styles.adminUsersCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h4>פרטים בסיסיים</h4>

              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                {user.role === "seller" && user.id_number && (
                  <button
                    className={styles.adminUsersBtn}
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

                <button
                  className={`${styles.adminUsersActionBtn} ${user.status === "active" ? styles.adminUsersActionDanger : styles.adminUsersActionOk}`}
                  onClick={handleLocalToggle}
                  disabled={togglingId === user.id}
                  title={user.status === "active" ? "השבת משתמש (חסימה)" : "החזר משתמש למערכת"}
                >
                  {togglingId === user.id ? "מבצע…" : user.status === "active" ? "השבת" : "החזר למערכת"}
                </button>
              </div>
            </div>

            <div className={styles.adminUsersField}><span>מזהה:</span><b>{user.id}</b></div>
            <div className={styles.adminUsersField}><span>ת״ז:</span><b>{user.id_number || "-"}</b></div>
            <div className={styles.adminUsersField}><span>שם:</span><b>{[user.first_name, user.last_name].filter(Boolean).join(" ") || "-"}</b></div>
            <div className={styles.adminUsersField}><span>דוא״ל:</span><b>{user.email || "-"}</b></div>
            <div className={styles.adminUsersField}><span>טלפון:</span><b>{user.phone || "-"}</b></div>

            {/* מיפוי תפקיד */}
            <div className={styles.adminUsersField}><span>תפקיד:</span><b>{formatRole(user.role)}</b></div>

            {/* מיפוי סטטוס */}
            <div className={styles.adminUsersField}><span>סטטוס:</span><b>{formatStatus(user.status)}</b></div>

            <div className={styles.adminUsersField}><span>תאריך ושעת הרשמה:</span><b>{user.registered ? new Date(user.registered).toLocaleString("he-IL") : "-"}</b></div>
            {user.role !== "buyer" && "rating" in user && (
              <div className={styles.adminUsersField}><span>דירוג:</span><b>{user.rating ?? "-"}</b></div>
            )}
          </div>

          <div className={styles.adminUsersCard}>
            <h4>כתובת</h4>
            <div className={styles.adminUsersField}><span>מדינה:</span><b>{user.country || "-"}</b></div>
            <div className={styles.adminUsersField}><span>עיר:</span><b>{user.city || "-"}</b></div>
            <div className={styles.adminUsersField}><span>רחוב:</span><b>{user.street || "-"}</b></div>
            <div className={styles.adminUsersField}><span>מס׳ בית:</span><b>{user.house_number || "-"}</b></div>
            <div className={styles.adminUsersField}><span>דירה:</span><b>{user.apartment_number || "-"}</b></div>
            <div className={styles.adminUsersField}><span>מיקוד:</span><b>{user.zip || "-"}</b></div>
          </div>

          <div className={styles.adminUsersCard}>
            <h4>תמונות</h4>
            <div className={styles.adminUsersField}><span>תמונת ת״ז:</span><b>{user.id_card_photo ? "קיים" : "—"}</b></div>
            <div className={styles.adminUsersField}><span>תמונת פרופיל:</span><b>{user.profile_photo ? "קיים" : "—"}</b></div>
          </div>

          {user.role !== "buyer" && (
            <div className={styles.adminUsersCard}>
              <h4>העדפות משלוח</h4>
              <div className={styles.adminUsersField}>
                <span>אפשרויות:</span>
                <b>{formatDeliveryOptions(user.delivery_options)}</b>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
