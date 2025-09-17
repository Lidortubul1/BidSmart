// src/pages/AdminMessages/AdminMessages.jsx
import React, { useState } from "react";
import TicketsBoard from "../../components/tickets/TicketsBoard";
import { useAuth } from "../../auth/AuthContext";
import s from "./AdminMessages.module.css";

export default function AdminMessages() {
  const { user } = useAuth();
  const [boardKey, setBoardKey] = useState(0);

  if (!user || user.role !== "admin") {
    return (
      <main className={s.noAccess}>
        <div className={s.lockBadge} aria-hidden>🔒</div>
        <h2>אין לך הרשאה לצפות בדף זה</h2>
        <p>רק מנהלים יכולים לצפות בניהול הפניות.</p>
      </main>
    );
  }

return (
  <main className={s.page}>
    {/* שכבת כתמים גלובלית לעמוד */}
    <div className={s.pageBg} aria-hidden />

    <header className={s.hero} role="banner">
      <div className={s.heroCard}>
        <div className={s.heroHead}>
          <div className={s.headerText}>
            <h1 className={s.title}>ניהול פניות</h1>
            <p className={s.subtitle}>צפייה, סינון ומענה לפניות גולשים — דיווחים והודעות כלליות.</p>
          </div>
        </div>

        <div className={s.headerActions}>
          <button
            type="button"
            className={`${s.btn} ${s.btnPrimary}`}
            onClick={() => setBoardKey(k => k + 1)}
            title="רענון רשימת הפניות"
          >
            ⟳ רענון
          </button>
        </div>
      </div>
    </header>

    <section className={s.contentCard} aria-label="לוח פניות">
      <TicketsBoard key={boardKey} />
    </section>
  </main>
);

}
