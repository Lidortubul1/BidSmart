// src/components/tickets/TicketsBoard.jsx
import React, { useEffect, useMemo, useState } from "react";
import TicketCard from "./TicketCard";
import { fetchTickets } from "../../services/contactApi";
import s from "./TicketsBoard.module.css";

export default function TicketsBoard() {
  const [type, setType] = useState("");            // '' | 'general' | 'report'
  const [status, setStatus] = useState("unread");  // ברירת־מחדל: לא נקראו
  const [q, setQ] = useState("");
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // כשמסננים לפי "דיווח" לא שולחים type=report לשרת, וכך נקבל גם את האב/ילדים
  // את סטטוס מסננים בצד לקוח (כדי לחשב סטטוס מצטבר של קבוצה)
  const params = useMemo(() => {
    const p = {};
    if (type && type !== "report") p.type = type;
    if (status && type !== "report") p.status = status;
    if (q.trim()) p.q = q.trim();
    return p;
  }, [type, status, q]);

  // קיבוץ דיווחים לפי product_id — סופרים רק ילדים (related_ticket_id != null)
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
            parentTicketId: null,
            status: "read",
            created_at: t.created_at,
            updated_at: t.updated_at,
          });
        }
        const g = groups.get(key);

        if (t.related_ticket_id) {
          // ילד
          g.ticketIds.push(t.ticket_id);
          g.reporters.push({
            first_name: t.first_name,
            last_name: t.last_name,
            email: t.email,
            ticket_id: t.ticket_id,
            created_at: t.created_at,
          });
          g.reporterMap[t.ticket_id] = {
            first_name: t.first_name,
            last_name: t.last_name,
            email: t.email,
          };
          g.reportersCount++;

          // עדכון "עדכון אחרון"
          if (new Date(t.updated_at) > new Date(g.updated_at)) g.updated_at = t.updated_at;

          // סטטוס מצטבר על בסיס הילדים
          if (t.status === "unread") g.status = "unread";
          else if (g.status !== "unread" && t.status === "progress") g.status = "progress";
        } else {
          // אב
          g.parentTicketId = t.ticket_id;
          if (new Date(t.updated_at) > new Date(g.updated_at)) g.updated_at = t.updated_at;
          if (new Date(t.created_at) < new Date(g.created_at)) g.created_at = t.created_at;
        }
      } else {
        others.push(t);
      }
    }

    const grouped = [...groups.values()];
    return [...grouped, ...others].sort(
      (a, b) =>
        new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at)
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
        const onlyReports = type === "report";

        // אם זה "דיווח" — נסנן מקומית ל-report בלבד
        const filtered = onlyReports ? rows.filter((r) => r.type_message === "report") : rows;

        // קיבוץ דיווחים
        const grouped = groupTicketsIfNeeded(filtered);

        // אם זה "דיווח" ויש סטטוס נבחר — נסנן מקומית לפי הסטטוס המצטבר של הקבוצה
        const finalList = onlyReports && status ? grouped.filter((g) => g.status === status) : grouped;

        setTickets(finalList);
      } catch {
        if (!alive) return;
        setErr("שגיאה בטעינת פניות");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    // נריץ גם כש-type/status משתנים, כי במצב report הם לא נשלחים לשרת בתוך params
  }, [params, type, status]);

  // עדכון סטטוס מכרטיס: גם רגיל לפי ticket_id וגם קבוצתי לפי חברות ב-ticketIds
  const handleStatusSaved = (ticketId, newStatus) => {
    setTickets((list) => {
      const updated = list.map((t) => {
        const matchById = t.ticket_id === ticketId;
        const matchByGroup =
          t.isGroupedReport && Array.isArray(t.ticketIds) && t.ticketIds.includes(ticketId);
        return matchById || matchByGroup ? { ...t, status: newStatus } : t;
      });

      // אם במסך "דיווח" ויש סינון סטטוס פעיל — החיל את הסינון מיידית
      if (type === "report" && status) {
        return updated.filter((g) => g.status === status);
      }
      return updated;
    });
  };

  return (
    <div className={s.board} dir="rtl">
      {/* מסננים */}
      <div className={s.filters}>
        <div className={s.field}>
          <label className={s.label}>סוג פנייה</label>
          <select className={s.select} value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">הכול</option>
            <option value="general">כללי</option>
            <option value="report">דיווח</option>
          </select>
        </div>

        <div className={s.field}>
          <label className={s.label}>סטטוס</label>
          <select className={s.select} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">הכול</option>
            <option value="unread">לא טופל</option>
            <option value="progress">בטיפול</option>
            <option value="read">טופל</option>
          </select>
        </div>

        <div className={s.field} style={{ flex: 1 }}>
          <label className={s.label}>חיפוש</label>
          <input
            className={s.search}
            type="search"
            placeholder="נושא, אימייל, שם…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
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
            <div
              key={t.isGroupedReport ? `grp-${t.product_id}` : t.ticket_id}
              className={s.cardWrap}
            >
              <TicketCard ticket={t} onStatusSaved={handleStatusSaved} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
