import { useState } from "react";              // useState – לניהול state מקומי של הקומפוננטה
import AdminUsersList from "./AdminUsersList"; // קומפוננטה המציגה את רשימת המשתמשים (טבלה/רשימה)
import styles from "./AdminUsers.module.css";  // מודול ה-CSS לעיצוב עמוד הניהול

/**
 * עמוד ניהול משתמשים (AdminUsersPage)
 * - מציג את רשימת המשתמשים דרך AdminUsersList
 * - מנהל את ה-ID של המשתמש שנבחר (selectedId) כדי לאפשר הדגשה/פרטים/פעולות נוספות ברשימה.
 * 
 * הערה: אין שינוי פונקציונלי – רק סדר וניקיון קוד + הערות.
 */
export default function AdminUsersPage() {
  // selectedId: מזהה המשתמש שנבחר ברשימה (null = לא נבחר עדיין)
  // setSelectedId: מעדכן את המזהה כאשר בוחרים משתמש מהרשימה
  const [selectedId, setSelectedId] = useState(null);

  return (
    // עטיפת העמוד – מחלקת עיצוב כללית עבור תצוגת עמוד משתמשים
    <div className={styles.auPage_single}>
      {/* רשימת המשתמשים:
          - selectedId: מועבר פנימה כדי שהרשימה תדע מי נבחר (למשל להדגשה)
          - onSelectUser: callback שהרשימה קוראת כשמשתמש לוחץ על שורה/כפתור; כאן נעדכן את ה-state המקומי */}
      <AdminUsersList
        selectedId={selectedId}       // ה-ID הנוכחי שנבחר (number | null)
        onSelectUser={setSelectedId}  // פונקציה שמקבלת ID ומעדכנת את הבחירה
      />
    </div>
  );
}
