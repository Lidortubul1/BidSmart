//AdminDashboardPage.jsx - דף ניהול משתמשים
import { useEffect, useState } from "react";
import styles from "./AdminDashboardPage.module.css";
import {
  getAllUsers,
  updateUserStatus,
  updateUserRole,
  deleteUser,
} from "../../services/api";

export default function AdminDashboardPage() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch (err) {
      setError("שגיאה בטעינת משתמשים");
    }
  }

  async function handleStatusChange(id, currentStatus) {
    const newStatus = currentStatus === "active" ? "blocked" : "active";
    try {
      await updateUserStatus(id, newStatus);
      loadUsers();
    } catch (err) {
      alert("שגיאה בעדכון סטטוס");
    }
  }

  async function handleRoleChange(id, newRole) {
    try {
      await updateUserRole(id, newRole);
      loadUsers();
    } catch (err) {
      alert("שגיאה בעדכון תפקיד");
    }
  }

  async function handleDelete(id) {
    if (window.confirm("האם למחוק את המשתמש?")) {
      try {
        await deleteUser(id);
        loadUsers();
      } catch (err) {
        alert("שגיאה במחיקה");
      }
    }
  }

  return (
    <div className={styles.adminContainer}>
      <h2>ניהול משתמשים</h2>
      {error && <p className={styles.error}>{error}</p>}
      <table className={styles.userTable}>
        <thead>
          <tr>
            <th>שם</th>
            <th>אימייל</th>
            <th>תפקיד</th>
            <th>סטטוס</th>
            <th>פעולות</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id_number}>
              <td>
                {user.first_name} {user.last_name}
              </td>
              <td>{user.email}</td>
              <td>
                <select
                  value={user.role}
                  onChange={(e) =>
                    handleRoleChange(user.id_number, e.target.value)
                  }
                >
                  <option value="buyer">קונה</option>
                  <option value="seller">מוכר</option>
                  <option value="admin">מנהל</option>
                </select>
              </td>
              <td>
                <button
                  onClick={() =>
                    handleStatusChange(user.id_number, user.status)
                  }
                >
                  {user.status === "active" ? "חסום" : "הפעל"}
                </button>
              </td>
              <td>
                <button onClick={() => handleDelete(user.id_number)}>
                  מחק
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
