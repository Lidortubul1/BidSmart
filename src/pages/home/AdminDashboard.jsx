// src/pages/home/AdminDashboard.jsx
import styles from "./AdminDashboard.module.css";

import AdminStatistics from "../AdminStatistics/AdminStatistics.jsx";
import RecentUnreadTickets from "../../components/tickets/RecentUnreadTickets.jsx";

function AdminDashboard() {




  return (
    <div className={styles.page}>
      {/* שכבת כתמים צדדיים */}
      <div className={styles.pageBg} aria-hidden />

      <section className={styles.hero}>
        <div className={styles.heroCard}>
          <div className={styles.heroText}>
            <h1> לוח בקרה BIDSMART</h1>
            <p className={styles.subText}>סקירה מהירה של נתוני המערכת וקישורים שימושיים</p>
          </div>

         
        </div>
      </section>

      {/* כרטיס: פניות שלא נקראו */}
      <section className={styles.contentSection}>
        <div className={styles.cardShell}>
          <RecentUnreadTickets />
          {/* כפתור מרכזי להשבה (נשמר הסגנון שביקשת) */}
          
        </div>
      </section>

      {/* כרטיס: סטטיסטיקות מנהל */}
      <section className={styles.contentSection}>
        <div className={styles.cardShell}>
          <AdminStatistics />
        </div>
      </section>
    </div>
  );
}

export default AdminDashboard;
