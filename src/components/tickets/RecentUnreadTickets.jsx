// src/components/tickets/RecentUnreadTickets.jsx
// ווידג'ט “פניות אחרונות שלא נקראו”: טוען שלוש תיבות (כללי/אדמין-מוכר/דיווחים מאוחדים),
// ממזג ומסנן כפילויות, מציג את 5 האחרונות עם TicketCard, ומעדכן סטטוס/מונה כשמסומנות כנקראו.

import { useEffect, useMemo, useState } from "react";
import { fetchTickets } from "../../services/contactApi";
import TicketCard from "./TicketCard";
import { Link } from "react-router-dom";
import s from "./RecentUnreadTickets.module.css";

export default function RecentUnreadTickets() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");

        //  מביאים כל סוג בנפרד:
        // general + admin_seller כרגיל, ו-report כהורים בלבד (כמו בדף הניהול)
        const [gen, admin, reports] = await Promise.all([
          fetchTickets({ type: "general", status: "unread" }),
          fetchTickets({ type: "admin_seller", status: "unread" }),
          fetchTickets({ type: "report", status: "unread" }), // ← יחזיר רק הורים
        ]);

        const genList     = gen?.tickets     ?? [];
const adminList   = admin?.tickets   ?? [];
const reportsList = (reports?.tickets ?? []).map(t => ({
  ...t,
  isGroupedReport: true,                  // לא חובה אחרי שינוי 1, אבל לא מזיק
  reportersCount: t.reports_count ?? 0,   // שהכרטיס ידע להציג “דיווחים: X משתמשים”
}));
        if (!alive) return;

const merged = [...genList, ...adminList, ...reportsList];

        // ביטול כפילויות ליתר ביטחון
        const dedupMap = new Map();
        for (const t of merged) dedupMap.set(t.ticket_id, t);

        setRows(Array.from(dedupMap.values()));
      } catch {
        if (!alive) return;
        setErr("שגיאה בטעינת פניות");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const totalUnread = rows.length;

  const latestFive = useMemo(() => {
    const key = (t) => new Date(t.updated_at || t.created_at || 0).getTime();
    return [...rows].sort((a, b) => key(b) - key(a)).slice(0, 5);
  }, [rows]);

  return (
    <section className={s.section} dir="rtl">
      <div className={s.header}>
        <h2 className={s.title}>פניות אחרונות שלא נקראו ({totalUnread})</h2>
        <Link to="/admin/messages" className={s.link}>לכל הפניות</Link>
      </div>

      {loading ? (
        <div className={s.loading}>טוען…</div>
      ) : err ? (
        <div className={s.error}>{err}</div>
      ) : latestFive.length === 0 ? (
        <div className={s.empty}>אין פניות שלא נקראו.</div>
      ) : (
        <div className={s.list}>
          {latestFive.map((t) => (
            <div key={t.ticket_id} className={s.cardWrap}>
              <TicketCard
                ticket={t}
                onStatusSaved={(id, newStatus) => {
                  if (newStatus === "read") {
                    setRows((prev) => prev.filter((x) => x.ticket_id !== id));
                  }
                }}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
