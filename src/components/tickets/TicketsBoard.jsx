// src/components/tickets/TicketsBoard.jsx
import React, { useEffect, useMemo, useState } from "react";
import TicketCard from "./TicketCard";
import { fetchTickets } from "../../services/contactApi";
import s from "./TicketsBoard.module.css";

export default function TicketsBoard() {
  const [type, setType] = useState("");     // '' | 'general' | 'report'
  const [status, setStatus] = useState("unread"); // ← כברירת־מחדל: לא נקראו
  const [q, setQ] = useState("");
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);

  // כשמסננים לפי "דיווח" לא שולחים type=report לשרת,
  // כדי לקבל את כל הטיקטים ולבצע קיבוץ בצד לקוח (כדי שהילדים יהיו זמינים לשרשור)
  const params = useMemo(() => {
    const p = {};
    if (type && type !== "report") p.type = type;
    if (status) p.status = status;
    if (q.trim()) p.q = q.trim();
    return p;
  }, [type, status, q]);

  // קיבוץ דיווחים לפי product_id — סופרים *רק* ילדים (related_ticket_id != null)
  function groupTicketsIfNeeded(rows) {
  const groups = new Map();
  const others = [];

  for (const t of rows) {
    if (t.type_message === "report" && t.product_id) {
      const key = String(t.product_id);
      if (!groups.has(key)) {
        groups.set(key, {
          ...t,
          isGroupedReport: true,
          subject: `דיווחים על מוצר #${t.product_id}`,
          reportersCount: 0,
          ticketIds: [],
          reporters: [],
          reporterMap: {},
          parentTicketId: null,       // ⬅️ חדש: נשמור מזהה אב אם קיים
          status: "read",
          created_at: t.created_at,
          updated_at: t.updated_at,
        });
      }
      const g = groups.get(key);

      if (t.related_ticket_id) {
        // ילד → נספר ונוסיף לרשימות
        g.ticketIds.push(t.ticket_id);
        g.reporters.push({
          first_name: t.first_name, last_name: t.last_name, email: t.email,
          ticket_id: t.ticket_id, created_at: t.created_at
        });
        g.reporterMap[t.ticket_id] = {
          first_name: t.first_name, last_name: t.last_name, email: t.email
        };
        g.reportersCount++;

        // עדכון "עדכון אחרון"
        if (new Date(t.updated_at) > new Date(g.updated_at)) g.updated_at = t.updated_at;

        // סטטוס מצטבר על בסיס הילדים בלבד
        if (t.status === "unread") g.status = "unread";
        else if (g.status !== "unread" && t.status === "progress") g.status = "progress";
      } else {
        // זה הורה → לא נספר, רק נשמור מזהה
        g.parentTicketId = t.ticket_id;
        // נעדכן זמנים אם צריך
        if (new Date(t.updated_at) > new Date(g.updated_at)) g.updated_at = t.updated_at;
        if (new Date(t.created_at) < new Date(g.created_at)) g.created_at = t.created_at;
      }
    } else {
      others.push(t);
    }
  }

  const grouped = [...groups.values()];
  return [...grouped, ...others].sort(
    (a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at)
  );
}


  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const res = await fetchTickets(params);
        if (!alive) return;
        const rows = res.tickets || [];
        setTickets(groupTicketsIfNeeded(rows));
      } catch {
        if (!alive) return;
        setErr("שגיאה בטעינת פניות");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [params, refreshTick]);

  const handleStatusSaved = (ticketId, newStatus) => {
    setTickets((list) =>
      list.map((t) => (t.ticket_id === ticketId ? { ...t, status: newStatus } : t))
    );
  };

  return (
    <div className={s.board} dir="rtl">
      {/* מסננים */}
      <div className={s.filters}>
        <div className={s.field}>
          <label className={s.label}>סוג פנייה</label>
          <select className={s.select} value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">הכל</option>
            <option value="general">כללי</option>
            <option value="report">דיווח</option>
          </select>
        </div>

        <div className={s.field}>
          <label className={s.label}>סטטוס</label>
          <select className={s.select} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">הכל</option>
            <option value="unread">לא טופל</option>
            <option value="progress">בטיפול</option>
            <option value="read">טופל</option>
          </select>
        </div>

        <div className={s.field} style={{flex:1}}>
          <label className={s.label}>חיפוש</label>
          <input
            className={s.search}
            type="search"
            placeholder="נושא, אימייל, שם…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className={s.refreshWrap}>
          <button className={s.refreshBtn} onClick={() => setRefreshTick(v => v+1)}>
            רענון
          </button>
        </div>
      </div>

      {/* תוצאות */}
      {loading ? (
        <div className={s.loading}>טוען פניות…</div>
      ) : err ? (
        <div className={s.error}>{err}</div>
      ) : tickets.length === 0 ? (
        <div className={s.empty}>אין פניות להצגה.</div>
      ) : (
        <div className={s.list}>
          {tickets.map((t) => (
            <TicketCard
              key={(t.isGroupedReport ? `grp-${t.product_id}` : t.ticket_id)}
              ticket={t}
              onStatusSaved={handleStatusSaved}
            />
          ))}
        </div>
      )}
    </div>
  );
}
