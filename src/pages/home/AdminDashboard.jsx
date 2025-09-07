//src\pages\home\AdminDashboard.jsx
// לוח בקרה מנהל (AdminDashboard): מציג מסך ניהול ראשי עם כותרת BIDSMART, סטטיסטיקות מנהל (AdminStatistics) ורשימת פניות אחרונות שלא נקראו (RecentUnreadTickets); כולל טעינת נתוני סיכום כלליים מה־adminApi.

import styles from "./AdminDashboard.module.css";
 import { useEffect, useState } from "react";
 import { getAdminStats } from "../../services/adminApi";
 
 import AdminStatistics from "../AdminStatistics/AdminStatistics.jsx";
import RecentUnreadTickets from "../../components/tickets/RecentUnreadTickets.jsx";

 function AdminDashboard() {
   const [stats, setStats] = useState({
     totalSellers: 0,
     totalUsers: 0,
     deliveredSales: 0,
     undeliveredSales: 0,
     upcomingProducts: 0,
     unsoldProducts: 0,
   });

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
           {/* <div className={styles.statsGrid}>
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
           </div> */}
         </div>
       </section>
     <RecentUnreadTickets />

       <AdminStatistics />
     </div>
   );
 }

 export default AdminDashboard;
