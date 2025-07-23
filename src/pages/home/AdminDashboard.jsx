import styles from "./AdminDashboard.module.css";
import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { getAdminStats } from "../../services/adminApi";

function AdminDashboard() {
const [stats, setStats] = useState({
  totalSellers: 0,
  totalUsers: 0,
  deliveredSales: 0,
  undeliveredSales: 0,
  upcomingProducts: 0,
  unsoldProducts: 0,
});



  const [messages, setMessages] = useState([]);

useEffect(() => {
  async function fetchStats() {
    const data = await getAdminStats();
    if (data) setStats(data);
  }
  fetchStats();
}, []);


  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <h1>BIDSMART לוח בקרה </h1>
          <div className={styles.statsGrid}>
            <div className={styles.card}>
              <h3>סה״כ מוכרים</h3>
              <p>{stats.totalSellers}</p>
            </div>
            <div className={styles.card}>
              <h3>סה״כ משתמשים</h3>
              <p>{stats.totalUsers}</p>
            </div>
            <div className={styles.card}>
              <h3>מוצרים שנמכרו והגיעו לרוכש</h3>
              <p>{stats.deliveredSales}</p>
            </div>
            <div className={styles.card}>
              <h3>מוצרים שנמכרו וטרם הגיעו לרוכש</h3>
              <p>{stats.undeliveredSales}</p>
            </div>
            <div className={styles.card}>
              <h3>מוצרים פעילים שטרם התחילו</h3>
              <p>{stats.upcomingProducts}</p>
            </div>
            <div className={styles.card}>
              <h3>מוצרים שלא נמכרו</h3>
              <p>{stats.unsoldProducts}</p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.quickLinks}>
        <h3>:קישורים מהירים</h3>
        <ul>
          <li>
            <Link to="/admin/categories">ניהול קטגוריות</Link>
          </li>
          <li>
            <Link to="/admin/users">ניהול משתמשים</Link>
          </li>
          <li>
            <Link to="/admin/products">ניהול מוצרים</Link>
          </li>
          <li>
            <Link to="/admin/messages">פניות משתמשים</Link>
          </li>
          <li>
            <Link to="/admin/stats">סטטיסטיקות</Link>
          </li>
        </ul>
      </section>

      <section className={styles.messagesSection}>
        <h3>:פניות אחרונות</h3>
        <ul>
          {messages.map((msg) => (
            <li key={msg.id}>
              {msg.subject} ({msg.email})
            </li>
          ))}
          {messages.length === 0 && <p>אין פניות להצגה</p>}
        </ul>
      </section>
    </div>
  );
}

export default AdminDashboard;
