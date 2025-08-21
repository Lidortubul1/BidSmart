import React from "react";
import TicketsBoard from "../../components/tickets/TicketsBoard";
import { useAuth } from "../../auth/AuthContext";
import s from "./AdminMessages.module.css";

/**
 * דף ניהול פניות למנהל
 * - מוודא שהמשתמש מנהל
 * - מציג רשימת פניות עם מסננים
 */
export default function AdminMessages() {
  const { user } = useAuth();

  if (!user || user.role !== "admin") {
    return (
      <main className={s.noAccess}>
        <h2>אין לך הרשאה לצפות בדף זה</h2>
        <p>רק מנהלים יכולים לצפות בניהול הפניות.</p>
      </main>
    );
  }

  return (
    <main className={s.page}>
      <header className={s.header}>
        <div className={s.headerText}>
          <h1 className={s.title}>ניהול פניות</h1>
          <p className={s.subtitle}>
            צפייה, סינון ומענה לפניות גולשים — דיווחים והודעות כלליות.
          </p>
        </div>
        <div className={s.headerActions}>
          {/* מקום לפעולות עתידיות (ייצוא, רענון כללי ועוד) */}
        </div>
      </header>

      <section className={s.contentCard}>
        <TicketsBoard />
      </section>
    </main>
  );
}
