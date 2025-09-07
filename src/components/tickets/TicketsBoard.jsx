// src/components/tickets/TicketsBoard.jsx
// לוח פניות מנהל: טוען פניות עם מסננים (סוג/סטטוס/חיפוש), מקבץ דיווחים לפי product_id
// (איחוד אב+ילדים) עם סטטוס אב עקבי, ממיין/מסנן, ומציג כרטיסי TicketCard כולל עדכון סטטוס בזמן אמת.

import React, { useEffect, useMemo, useState } from "react";
import TicketCard from "./TicketCard";
import { fetchTickets } from "../../services/contactApi";
import s from "./TicketsBoard.module.css";

export default function TicketsBoard() {
  const [type, setType] = useState(""); // '' | 'general' | 'report'
  const [status, setStatus] = useState("unread"); // ברירת־מחדל: לא נקראו
  const [q, setQ] = useState("");
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // כשמסננים לפי "דיווח" לא שולחים type=report או status לשרת (נחשב בצד לקוח)
  const params = useMemo(() => {
    const p = {};
    if (type && type !== "report") p.type = type;
    if (status && type !== "report") p.status = status;
    if (q.trim()) p.q = q.trim();
    return p;
  }, [type, status, q]);

  // בונה מפה של אבות report לפי product_id
  function buildParentsIndex(reportParentsRows = []) {
    const map = new Map(); // key: product_id -> ticket row (parent)
    for (const r of reportParentsRows) {
      if (
        r.type_message === "report" &&
        !r.related_ticket_id &&
        r.product_id != null
      ) {
        map.set(String(r.product_id), r);
      }
    }
    return map;
  }

  // קיבוץ דיווחים לפי product_id; ממלאים parentStatus/parentTicketId מאינדקס ההורים
  function groupTicketsIfNeeded(rows, parentsIndex) {
    const groups = new Map();
    const others = [];

    for (const t of rows) {
      if (t.type_message === "report" && t.product_id != null) {
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
            parentStatus: null, // נשתמש בו לסינון
            status: null, // יוצג בצ'יפ — ניישר לסטטוס האב
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
          if (new Date(t.updated_at) > new Date(g.updated_at))
            g.updated_at = t.updated_at;
        } else {
          // אב הופיע בפלט הראשי
          g.parentTicketId = t.ticket_id;
          g.parentStatus = t.status;
          g.status = t.status;
          if (new Date(t.updated_at) > new Date(g.updated_at))
            g.updated_at = t.updated_at;
          if (new Date(t.created_at) < new Date(g.created_at))
            g.created_at = t.created_at;
        }
      } else {
        // לא report
        others.push(t);
      }
    }

    // משלימים פרטי אב חסרים מאינדקס ההורים (גם אם האב לא חזר מהקריאה הראשית בגלל סינון סטטוס)
    for (const [key, g] of groups) {
      if (!g.parentTicketId || !g.parentStatus) {
        const p = parentsIndex.get(key);
        if (p) {
          g.parentTicketId = p.ticket_id;
          g.parentStatus = p.status;
          g.status = p.status;
          // נעדכן טווחי תאריכים לפי האב
          if (new Date(p.updated_at) > new Date(g.updated_at))
            g.updated_at = p.updated_at;
          if (new Date(p.created_at) < new Date(g.created_at))
            g.created_at = p.created_at;
        }
      }
    }

    // חשוב: לוודא ש־ticket_id של הכרטיס הוא מזהה האב כדי שטעינת השיחה תביא אב+ילדים
    const grouped = [...groups.values()].map((g) => ({
      ...g,
      ticket_id: g.parentTicketId || g.ticket_id, // fallback אם אין אב (מקרה קצה)
    }));

    // מיון לפי עדכון אחרון
    return [...grouped, ...others].sort(
      (a, b) =>
        new Date(b.updated_at || b.created_at) -
        new Date(a.updated_at || a.created_at)
    );
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");

        // 1) הקריאה הראשית בהתאם למסננים
        // 2) בנוסף — תמיד נביא את אבות ה־report (type=report) בלי סטטוס כדי שנדע parentStatus אמיתי
        const [main, parents] = await Promise.all([
          fetchTickets(params),
          fetchTickets({ type: "report" }), // יחזיר רק הורים
        ]);
        if (!alive) return;

        const rows = main?.tickets || [];
        const reportParents = parents?.tickets || [];
        const parentsIndex = buildParentsIndex(reportParents);

        const onlyReports = type === "report";
        const filteredRows = onlyReports
          ? rows.filter((r) => r.type_message === "report")
          : rows;

        const grouped = groupTicketsIfNeeded(filteredRows, parentsIndex);

        let finalList = grouped;

        // סינון עקבי לפי סטטוס האב בכל מצב:
        // - אם type === "report": מציג קבוצות בלבד; מסננים לפי parentStatus.
        // - אם type !== "report": משאירים כרטיסים שאינם report כרגיל (השרת כבר סינן),
        //   ועל קבוצות report מיישמים את אותו כלל: לכלול רק אם parentStatus תואם למסנן.
        if (status) {
          const keepGroup = (g) =>
            !g.isGroupedReport || (g.parentStatus && g.parentStatus === status);

          if (onlyReports) {
            finalList = grouped.filter(keepGroup);
          } else {
            // מפרידים בין קבוצות report לאחרים כדי לא לגעת באחרים
            const nonGroups = grouped.filter((t) => !t.isGroupedReport);
            const groupsOnly = grouped.filter(
              (t) => t.isGroupedReport && keepGroup(t)
            );
            finalList = [...groupsOnly, ...nonGroups].sort(
              (a, b) =>
                new Date(b.updated_at || b.created_at) -
                new Date(a.updated_at || a.created_at)
            );
          }
        }

        setTickets(finalList);
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
  }, [params, type, status]);

  // עדכון סטטוס מכרטיס: אם זה כרטיס קבוצה — מעדכנים parentStatus+status כדי שהסינון יישאר עקבי
  const handleStatusSaved = (ticketId, newStatus) => {
    setTickets((list) => {
      const updated = list.map((t) => {
        const isGroup =
          t.isGroupedReport &&
          (t.ticket_id === ticketId || t.parentTicketId === ticketId);
        return isGroup
          ? { ...t, parentStatus: newStatus, status: newStatus }
          : t;
      });

      // אם המסנן פעיל — מסננים קבוצות לפי parentStatus
      if (status) {
        return updated.filter(
          (t) => !t.isGroupedReport || t.parentStatus === status
        );
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
          <select
            className={s.select}
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="">הכל</option>
            <option value="general">כללי</option>
            <option value="report">דיווח</option>
          </select>
        </div>

        <div className={s.field}>
          <label className={s.label}>סטטוס</label>
          <select
            className={s.select}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">הכל</option>
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
