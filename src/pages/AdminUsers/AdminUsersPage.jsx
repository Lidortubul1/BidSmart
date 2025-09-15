import { useState } from "react";
import AdminUsersList from "./AdminUsersList";
import styles from "./AdminUsers.module.css";

/** עמוד ניהול משתמשים — עטיפה עיצובית בלבד, ללא שינוי לוגי */
export default function AdminUsersPage() {
  const [selectedId, setSelectedId] = useState(null);

  return (
    <div className={styles.adminUsersPage}>
      {/* Hero שקוף עם “כתמי אור” כמו בעמוד הקטגוריות */}
      <section className={styles.adminUsersHero}>
        <div className={styles.adminUsersHeroText}>
          <h1>ניהול משתמשים</h1>
          <p className={styles.adminUsersSubText}>
            חיפוש, סינון, צפייה בפרטים ובקרת סטטוס — בזמן אמת.
          </p>
        </div>
      </section>

      {/* רשימת המשתמשים (הטבלאות והמסננים בתוך הקומפוננטה) */}
      <section className={styles.adminUsersSection}>
        <AdminUsersList
          selectedId={selectedId}
          onSelectUser={setSelectedId}
        />
      </section>
    </div>
  );
}
