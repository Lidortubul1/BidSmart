import styles from "./AdminUsers.module.css";
import { useEffect, useState } from "react";
import CustomModal from "../../components/CustomModal/CustomModal"; // ייבוא הקומפוננטה
import EditUserModal from "../../components/EditUserModal/EditUserModal";
import {
  updateUserDetails,
  updateUserStatus,
  fetchAllUsers,
} from "../../services/adminUsersApi";

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [editUser, setEditUser] = useState(null);

  const [search, setSearch] = useState("");
  const [filtered, setFiltered] = useState([]);
  const [modal, setModal] = useState({
    show: false,
    title: "",
    message: "",
    confirmText: "",
    onConfirm: null,
  });

  // קריאה לשרת בתחילת הטעינה
  useEffect(() => {
    async function loadUsers() {
      try {
        const data = await fetchAllUsers();
        setUsers(data);
      } catch (e) {
        setModal({
          show: true,
          title: "שגיאה",
          message: "שגיאה בטעינת המשתמשים.\nבדוק את החיבור לשרת ונסה שוב.",
          confirmText: "סגור",
          onConfirm: () => setModal({ ...modal, show: false }),
        });
      }
    }
    loadUsers();
    // eslint-disable-next-line
  }, []);

  // חיפוש/סינון
  useEffect(() => {
    setFiltered(
      users.filter(
        (u) =>
          (u.first_name && u.first_name.includes(search)) ||
          (u.last_name && u.last_name.includes(search)) ||
          (u.email && u.email.includes(search)) ||
          (u.id_number && u.id_number.includes(search))
      )
    );
  }, [search, users]);

  // בתוך הפונקציה הראשית:
  const handleSuspend = async (user) => {
    // בודק את הסטטוס הנוכחי ומחליף
    const newStatus = user.status === "active" ? "blocked" : "active";
    try {
      await updateUserStatus(user.email, newStatus);
      // עדכון הסטייט (במקום פנייה מחדש לשרת)
      setUsers((prev) =>
        prev.map((u) =>
          u.email === user.email ? { ...u, status: newStatus } : u
        )
      );
    } catch {
      setModal({
        show: true,
        title: "שגיאה",
        message: "לא ניתן לעדכן סטטוס משתמש.\nנסה שוב מאוחר יותר.",
        confirmText: "סגור",
        onConfirm: () => setModal((prev) => ({ ...prev, show: false })),
      });
    }
  };
  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.heroText}>
          <h1>ניהול משתמשים</h1>
          <div className={styles.subText}>
            כאן תוכלו לצפות, לחפש ולנהל את כל המשתמשים במערכת.
            <br />
            אפשר לערוך, להשעות, למחוק ולהציג מידע מפורט על כל משתמש.
          </div>
        </div>
      </div>
      <input
        className={styles.searchInput}
        type="text"
        placeholder="חיפוש לפי שם, מייל או ת״ז..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <section className={styles.productsSection}>
        <h2>רשימת משתמשים</h2>
        <div className={styles.table}>
          <div className={styles.tableHeader}>
            <div>שם מלא</div>
            <div>דוא"ל</div>
            <div>תפקיד</div>
            <div>סטטוס</div>
            <div>פעולות</div>
          </div>
          {filtered.length === 0 && (
            <div
              className={styles.tableRow}
              style={{ justifyContent: "center" }}
            >
              לא נמצאו משתמשים
            </div>
          )}
          {filtered.map((u) => (
            <div key={u.email} className={styles.tableRow}>
              <div>
                {u.first_name} {u.last_name}
              </div>
              <div>{u.email}</div>
              <div>
                {u.role === "buyer"
                  ? "קונה"
                  : u.role === "seller"
                  ? "מוכר"
                  : "מנהל"}
              </div>
              <div>
                <span
                  style={{
                    color: u.status === "active" ? "#06915f" : "#e04d4d",
                    fontWeight: 600,
                  }}
                >
                  {u.status === "active" ? "פעיל" : "מושהה"}
                </span>
              </div>
              <div className={styles.actionButtons}>
                <button
                  className={styles.editBtn}
                  onClick={() => setEditUser(u)}
                >
                  ערוך
                </button>
                <button
                  className={styles.suspendBtn}
                  onClick={() => handleSuspend(u)}
                >
                  {u.status === "active" ? "השבת" : "הפעל"}
                </button>

                <button className={styles.deleteBtn}>מחק</button>
              </div>
            </div>
          ))}
        </div>
      </section>
      {editUser && (
        <EditUserModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSave={async (updatedUser) => {
            try {
              await updateUserDetails(updatedUser.email, updatedUser);
              // עדכון ה־state – מחליף את המשתמש ב־users בחדש
              setUsers((prev) =>
                prev.map((u) =>
                  u.email === updatedUser.email ? { ...u, ...updatedUser } : u
                )
              );
              setModal({
                show: true,
                title: "הצלחה",
                message: "המשתמש עודכן בהצלחה!",
                confirmText: "סגור",
                onConfirm: () => setModal((m) => ({ ...m, show: false })),
              });
            } catch (e) {
              setModal({
                show: true,
                title: "שגיאה",
                message: "אירעה שגיאה בעדכון המשתמש.",
                confirmText: "סגור",
                onConfirm: () => setModal((m) => ({ ...m, show: false })),
              });
            }
            setEditUser(null);
          }}
        />
      )}
      {modal.show && (
        <CustomModal
          title={modal.title}
          message={modal.message}
          confirmText={modal.confirmText}
          onConfirm={modal.onConfirm}
        />
      )}
    </div>
  );
}

export default AdminUsers;
