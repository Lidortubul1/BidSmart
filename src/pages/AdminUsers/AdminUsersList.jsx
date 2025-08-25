import React, { useEffect, useMemo, useState } from "react";
import { getUsers, updateUserStatus } from "../../services/adminApi";
import AdminUserDetails from "./AdminUserDetails";
import styles from "./AdminUsers.module.css";

/**
 * props:
 *  - selectedId: number | null
 *  - onSelectUser: (id: number | null) => void
 */
export default function AdminUsersList({ selectedId, onSelectUser }) {
  const [users, setUsers] = useState([]);
  const [role, setRole] = useState("");          // "" | "buyer" | "seller"
  const [statusFilter, setStatusFilter] = useState(""); // "" | "active" | "blocked"
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [togglingId, setTogglingId] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    let arr = users;

    // סינון לפי סטטוס
    if (statusFilter) arr = arr.filter(u => (u.status || "").toLowerCase() === statusFilter);

    // סינון לפי תפקיד
    if (role) arr = arr.filter(u => u.role === role);

    // חיפוש טקסטואלי
    if (q) {
      arr = arr.filter(u => {
        const hay = [
          u.email, u.id_number, u.first_name, u.last_name, u.phone, u.city, u.street
        ]
          .map(x => (x || "").toString().toLowerCase())
          .join(" ");
        return hay.includes(q);
      });
    }

    // להצגה רק של buyer/seller
    arr = arr.filter(u => u.role === "buyer" || u.role === "seller");

    return arr;
  }, [users, query, role, statusFilter]);

  const toggleRow = (id) => {
    onSelectUser?.(selectedId === id ? null : id);
  };

const handleToggleStatus = async (user, e) => {
  e?.stopPropagation();
  const nextStatus = user.status === "active" ? "blocked" : "active";
  setTogglingId(user.id);
  try {
    const resp = await updateUserStatus(user.id, nextStatus);
    // עדכון מיידי של ה־state המקומי
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: nextStatus } : u));

    // אם בא לך להציג תוצאה:
    // showModal({ title: "עודכן", message: JSON.stringify(resp) })
    console.log("Admin status toggle result:", resp);
  } finally {
    setTogglingId(null);
  }
};




  const COLS = 9; // עדכנו כי הוספנו עמודת "פעולה"

  return (
    <div className={styles.auList_wrapper}>
      <div className={styles.auList_headerRow}>
        <div>
          <h2 className={styles.au_title}>משתמשים (Buyer/Seller)</h2>
          <p className={styles.au_subtitle}>לחיצה על שורה תפתח פרטי משתמש מתחתיה</p>
        </div>

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

      {loading && <div className={styles.au_state}>טוען…</div>}
      {error && <div className={styles.au_error}>{error}</div>}

      {!loading && !error && (
        <div className={styles.auTable_wrap}>
          <table className={styles.auTable}>
            <thead>
              <tr>
                <th>#</th>
                <th>ת״ז</th>
                <th>שם</th>
                <th>דוא״ל</th>
                <th>טלפון</th>
                <th>תפקיד</th>
                <th>סטטוס</th>
                <th>נרשם בתאריך</th>
                <th>פעולה</th>
              </tr>
            </thead>
<tbody>
  {filtered.map((u) => (
    <React.Fragment key={u.id}>
      {/* שורת הנתונים הראשית */}
      <tr>
        <td className={styles.au_row} onClick={() => toggleRow(u.id)}>{u.id}</td>
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
        <td className={styles.au_actionCol}>
          <button
            className={`${styles.au_actionBtn} ${u.status === "active" ? styles.au_actionDanger : styles.au_actionOk}`}
            onClick={(e) => handleToggleStatus(u, e)}
            disabled={togglingId === u.id}
            title={u.status === "active" ? "השבת משתמש (חסימה)" : "החזר משתמש למערכת"}
          >
            {togglingId === u.id
              ? "מבצע…"
              : u.status === "active"
              ? "השבת"
              : "החזר למערכת"}
          </button>
        </td>
      </tr>

      {/* שורת פרטים – מופיעה ישירות אחרי השורה הראשית אם נבחר */}
      {selectedId === u.id && (
        <tr className={styles.auDetails_row}>
          <td colSpan={COLS} className={styles.auDetails_cell}>
            <div className={styles.auDetails_card}>
              <AdminUserDetails
                userId={u.id}
                onClose={() => onSelectUser(null)}
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
