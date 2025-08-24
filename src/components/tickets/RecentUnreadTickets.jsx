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
        // מביא את כל הטיקטים שלא נקראו (כללי + דיווח)
        const res = await fetchTickets({ status: "unread" });
        if (!alive) return;
        setRows(Array.isArray(res?.tickets) ? res.tickets : []);
      } catch {
        if (!alive) return;
        setErr("שגיאה בטעינת פניות");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => { alive = false; };
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
                  // אם שינית סטטוס ל"נקרא" — נעלים מהרשימה במקום
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
