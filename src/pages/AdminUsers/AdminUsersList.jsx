import React, { useEffect, useMemo, useState } from "react"; // React + hooks לניהול מצב, חישובים נגזרים וטעינות
import { getUsers, updateUserStatus } from "../../services/adminApi"; // קריאות API: שליפת משתמשים + עדכון סטטוס
import AdminUserDetails from "./AdminUserDetails";                   // קומפוננטה להצגת פרטי משתמש מתחת לשורה
import styles from "./AdminUsers.module.css";                        // מודול CSS לעיצוב עמוד המשתמשים

/**
 * AdminUsersList
 * טבלת ניהול משתמשים (buyer/seller) עם:
 * - סינון לפי תפקיד/סטטוס + חיפוש
 * - פתיחת פרטי משתמש בשורה מתחת (inline)
 * - פעולה מהירה: חסימה/החזרה לפעילות
 *
 * props:
 *  - selectedId: number | null  → המזהה של המשתמש שהשורה שלו פתוחה (פרטים)
 *  - onSelectUser: (id: number | null) => void → פותח/סוגר פרטי משתמש
 */
//רשימה של המשתמשים - דף מנהל
export default function AdminUsersList({ selectedId, onSelectUser }) {
  // כל המשתמשים שנטענו מהשרת (buyer/seller)
  const [users, setUsers] = useState([]);

  // מסננים עליונים
  const [role, setRole] = useState("");                  // "" | "buyer" | "seller"
  const [statusFilter, setStatusFilter] = useState("");  // "" | "active" | "blocked"
  const [query, setQuery] = useState("");                // חיפוש טקסטואלי חופשי

  // סטטוסי טעינה/שגיאה
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // מזהה משתמש שנמצא כרגע בעדכון סטטוס (לחסימת/השבה) – כדי להראות "מבצע…" ולמנוע קליקים כפולים
  const [togglingId, setTogglingId] = useState(null);

  // טעינת משתמשים בעת שינוי ה-role (תפקיד)
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        // אם role ריק – לא נשלח פרמטר ונטען את כולם; אחרת נטעין רק buyer/seller כפי שנבחר
        const data = await getUsers({ role: role || undefined });
        setUsers(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
        setError("שגיאה בטעינת המשתמשים");
      } finally {
        setLoading(false);
      }
    })();
  }, [role]);

  // רשימה מסוננת לתצוגה – תלויה במשתמשים + מסננים
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase(); // מחרוזת חיפוש מנורמלת
    let arr = users;

    // סינון לפי סטטוס אם נבחר (active/blocked)
    if (statusFilter) arr = arr.filter(u => (u.status || "").toLowerCase() === statusFilter);

    // סינון לפי תפקיד אם נבחר (buyer/seller)
    if (role) arr = arr.filter(u => u.role === role);

    // חיפוש טקסטואלי בכמה שדות רלוונטיים
    if (q) {
      arr = arr.filter(u => {
        const hay = [
          u.email, u.id_number, u.first_name, u.last_name, u.phone, u.city, u.street
        ].map(x => (x || "").toString().toLowerCase()).join(" ");
        return hay.includes(q);
      });
    }

    // ביטוח: נציג רק buyer/seller (למקרה שהגיעו תפקידים אחרים)
    arr = arr.filter(u => u.role === "buyer" || u.role === "seller");

    return arr;
  }, [users, query, role, statusFilter]);

  // פתיחת/סגירת פרטי משתמש לשורה שנלחצה
  const toggleRow = (id) => {
    onSelectUser?.(selectedId === id ? null : id);
  };

  // לחצן חסימה/החזרה לפעילות (טיפול בסטטוס המשתמש)
const handleToggleStatus = async (user) => {
  const nextStatus = user.status === "active" ? "blocked" : "active";
  setTogglingId(user.id);
  try {
    const resp = await updateUserStatus(user.id, nextStatus);
    setUsers(prev => prev.map(u => (u.id === user.id ? { ...u, status: nextStatus } : u)));
    console.log("Admin status toggle result:", resp);
  } finally {
    setTogglingId(null);
  }
};


  // מספר העמודות בטבלה (לשימוש ב-colSpan של שורת הפרטים)
  const COLS = 7;

  return (
    <div className={styles.auList_wrapper}>
      {/* כותרת + סרגל מסננים */}
      <div className={styles.auList_headerRow}>
        <div>
          <h2 className={styles.au_title}>משתמשים (Buyer/Seller)</h2>
          <p className={styles.au_subtitle}>לחיצה על שורה תפתח פרטי משתמש מתחתיה</p>
        </div>

        {/* מסננים עליונים: חיפוש, תפקיד, סטטוס */}
        <div className={styles.auList_filters}>
          <input
            className={styles.au_input}
            placeholder="חיפוש: דוא״ל / שם / ת״ז / טלפון…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <select
            className={styles.au_select}
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="">כל התפקידים</option>
            <option value="buyer">קונה</option>
            <option value="seller">מוכר</option>
          </select>

          <select
            className={styles.au_select}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            title="סינון לפי סטטוס"
          >
            <option value="">כל הסטטוסים</option>
            <option value="active">פעילים</option>
            <option value="blocked">חסומים</option>
          </select>
        </div>
      </div>

      {/* מצבי טעינה/שגיאה */}
      {loading && <div className={styles.au_state}>טוען…</div>}
      {error && <div className={styles.au_error}>{error}</div>}

      {/* טבלה: מוצגת רק כשאין טעינה ואין שגיאה */}
      {!loading && !error && (
        <div className={styles.auTable_wrap}>
          <table className={styles.auTable}>
            <thead>
              <tr>
                <th>ת״ז</th>             
                <th>שם</th>                
                <th>דוא״ל</th>           
                <th>טלפון</th>           
                <th>תפקיד</th>            
                <th>סטטוס</th>           
                <th>נרשם בתאריך</th>                 
              </tr>
            </thead>

            <tbody>
              {filtered.map((u) => (
                <React.Fragment key={u.id}>
                  <tr>
                  
                    <td className={styles.au_row} onClick={() => toggleRow(u.id)}>{u.id_number || "-"}</td>
                    <td className={styles.au_row} onClick={() => toggleRow(u.id)}>
                      {[u.first_name, u.last_name].filter(Boolean).join(" ") || "-"}
                    </td>
                    <td className={styles.au_row} onClick={() => toggleRow(u.id)}>{u.email || "-"}</td>
                    <td className={styles.au_row} onClick={() => toggleRow(u.id)}>{u.phone || "-"}</td>
                    <td className={styles.au_row} onClick={() => toggleRow(u.id)}>{u.role}</td>
                    <td className={styles.au_row} onClick={() => toggleRow(u.id)}>
                      <span className={`${styles.au_badge} ${u.status === "active" ? styles.au_badgeActive : styles.au_badgeBlocked}`}>
                        {u.status === "active" ? "פעיל" : "חסום"}
                      </span>
                    </td>
                    <td className={styles.au_row} onClick={() => toggleRow(u.id)}>
                      {u.registered ? new Date(u.registered).toLocaleDateString("he-IL") : "-"}
                    </td>
                 
                  </tr>

                  {selectedId === u.id && (
                    <tr className={styles.auDetails_row}>
                     
                      <td colSpan={COLS} className={styles.auDetails_cell}>
                        <div className={styles.auDetails_card}>
<AdminUserDetails
  userId={u.id}
  onClose={() => onSelectUser(null)}
  onToggleStatus={(user) => handleToggleStatus(user)}
  togglingId={togglingId}
/>


                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={COLS} className={styles.au_state}>לא נמצאו משתמשים</td>
                </tr>
              )}
            </tbody>

          </table>
        </div>
      )}
    </div>
  );
}
