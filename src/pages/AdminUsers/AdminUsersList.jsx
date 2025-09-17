import React, { useEffect, useMemo, useState } from "react";
import { getUsers, updateUserStatus } from "../../services/adminApi";
import AdminUserDetails from "./AdminUserDetails";
import styles from "./AdminUsers.module.css";

/** טבלת ניהול משתמשים — מציגה רק ת"ז + שם + דוא"ל + תפקיד + סטטוס + נרשם בתאריך */
export default function AdminUsersList({ selectedId, onSelectUser }) {
  const [users, setUsers] = useState([]);
  const [role, setRole] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
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

  // === עזרי תצוגה ===
  const formatRole = (r) => {
    const val = String(r || "").toLowerCase();
    if (val === "seller") return "משתמש מוכר";
    if (val === "buyer") return "משתמש רגיל";
    return r || "-";
  };



  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let arr = users;
    if (statusFilter) arr = arr.filter(u => (u.status || "").toLowerCase() === statusFilter);
    if (role) arr = arr.filter(u => u.role === role);
    if (q) {
      arr = arr.filter(u => {
        const hay = [
          u.email, u.id_number, u.first_name, u.last_name, u.phone, u.city, u.street
        ].map(x => (x || "").toString().toLowerCase()).join(" ");
        return hay.includes(q);
      });
    }
    return arr.filter(u => u.role === "buyer" || u.role === "seller");
  }, [users, query, role, statusFilter]);

  const toggleRow = (id) => onSelectUser?.(selectedId === id ? null : id);

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

  // מספר עמודות בטבלה לאחר הסרת הטלפון
  const COLS = 6;

  return (
    <div className={styles.adminUsersListWrap}>
      {/* כותרת + מסננים */}
      <div className={styles.adminUsersHeaderCard}>
        <div className={styles.adminUsersHeaderText}>
          <h2 className={styles.adminUsersTitle}>כל המשתמשים</h2>
          <p className={styles.adminUsersSubtitle}>לחיצה על שורה תפתח פרטי משתמש מתחתיה</p>
        </div>

        <div className={styles.adminUsersFilters}>
          <input
            className={styles.adminUsersInput}
            placeholder="חיפוש: דוא״ל / שם / ת״ז / טלפון…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="חיפוש משתמשים"
          />

          <select
            className={styles.adminUsersSelect}
            value={role}
            onChange={(e) => setRole(e.target.value)}
            aria-label="סינון לפי תפקיד"
          >
            <option value="">כל התפקידים</option>
            <option value="buyer">קונה</option>
            <option value="seller">מוכר</option>
          </select>

          <select
            className={styles.adminUsersSelect}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="סינון לפי סטטוס"
            title="סינון לפי סטטוס"
          >
            <option value="">כל הסטטוסים</option>
            <option value="active">פעילים</option>
            <option value="blocked">חסומים</option>
          </select>
        </div>
      </div>

      {loading && <div className={styles.adminUsersState}>טוען…</div>}
      {error && <div className={styles.adminUsersError}>{error}</div>}

      {!loading && !error && (
        <div className={styles.adminUsersTableWrap}>
          <table className={styles.adminUsersTable}>
            <thead>
              <tr>
                <th>ת״ז</th>
                <th>שם</th>
                <th>דוא״ל</th>
                <th>תפקיד</th>
                <th>סטטוס</th>
                <th>נרשם בתאריך</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((u) => (
                <React.Fragment key={u.id}>
                  <tr>
                    <td className={styles.adminUsersRow} onClick={() => toggleRow(u.id)}>{u.id_number || "-"}</td>
                    <td className={styles.adminUsersRow} onClick={() => toggleRow(u.id)}>
                      {[u.first_name, u.last_name].filter(Boolean).join(" ") || "-"}
                    </td>
                    <td className={styles.adminUsersRow} onClick={() => toggleRow(u.id)}>{u.email || "-"}</td>

                    {/* תפקיד ממופה */}
                    <td className={styles.adminUsersRow} onClick={() => toggleRow(u.id)}>
                      {formatRole(u.role)}
                    </td>

                    {/* סטטוס בתגית — כמו שהיה */}
                    <td className={styles.adminUsersRow} onClick={() => toggleRow(u.id)}>
                      <span className={`${styles.adminUsersBadge} ${u.status === "active" ? styles.adminUsersBadgeActive : styles.adminUsersBadgeBlocked}`}>
                        {u.status === "active" ? "פעיל" : "חסום"}
                      </span>
                    </td>

                    <td className={styles.adminUsersRow} onClick={() => toggleRow(u.id)}>
                      {u.registered ? new Date(u.registered).toLocaleDateString("he-IL") : "-"}
                    </td>
                  </tr>

                  {selectedId === u.id && (
                    <tr className={styles.adminUsersDetailsRow}>
                      <td colSpan={COLS} className={styles.adminUsersDetailsCell}>
                        <div className={styles.adminUsersDetailsCard}>
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
                  <td colSpan={COLS} className={styles.adminUsersState}>לא נמצאו משתמשים</td>
                </tr>
              )}
            </tbody>

          </table>
        </div>
      )}
    </div>
  );
}
