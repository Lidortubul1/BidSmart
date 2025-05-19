import styles from "./AdminDashboard.module.css";
import { useEffect, useState } from "react";
import axios from "axios";

function AdminDashboard() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await axios.get("http://localhost:5000/api/admin/users");
        setUsers(res.data);
      } catch (e) {
        console.error("שגיאה בטעינת משתמשים", e);
      }
    }

    fetchUsers();
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.welcomeSection}>
        <h1>ניהול משתמשים</h1>
        <p>ניהול ובקרה על משתמשי המערכת</p>
      </div>
      <div className={styles.content}>
        <table>
          <thead>
            <tr>
              <th>אימייל</th>
              <th>תפקיד</th>
              <th>ת.ז</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id_number}>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>{user.id_number}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminDashboard;
