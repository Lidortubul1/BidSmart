// src/components/tickets/TicketCard.jsx
// כרטיס פנייה (כללי/דיווח/מקובץ): מציג שרשור הודעות, טוען ילדים למוצר, מחשב סטטוסים מאוגדים,
// משנה סטטוס (עם cascade), שולח מענה למשתמש/הודעה למוכר, שומר הערת מנהל פנימית,
// מאפשר חסימת מוצר ושליחת מייל לנרשמים, וכולל גלילה, תגים ומטא (ספירת דיווחים/תאריכים).

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  fetchTicketMessages,
  updateTicketStatus,
  sendAdminMessage,
  adminSendMessageToSeller,
  fetchProductReportTickets,
  adminAddInternalNoteByProduct,
  adminAddInternalNoteByTicket,
} from "../../services/contactApi";
import { adminFetchProduct, cancelProductSale } from "../../services/productApi";
import { Link } from "react-router-dom";
import s from "./TicketCard.module.css";

export default function TicketCard({ ticket, productId, onStatusSaved }) {
  // --- מצבים כלליים ---
  const [open, setOpen] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [messages, setMessages] = useState([]);
  const [savingStatus, setSavingStatus] = useState(false);

  // מענה "כללי"
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  // הערת מנהל (פנימית, לא נשלחת)
  const [adminNote, setAdminNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // הודעה למוכר (בכרטיס דיווח מקובץ / מצב מוצר)
  const [sellerMsg, setSellerMsg] = useState("");
  const [sendingSeller, setSendingSeller] = useState(false);

  // חסימת מוצר
  const [prodStatus, setProdStatus] = useState("");
  const [blocking, setBlocking] = useState(false);
  const [notice, setNotice] = useState("");

  const [error, setError] = useState("");
  const [mailInfo, setMailInfo] = useState(null);

  const threadRef = useRef(null);

  // --- מצב מוצר (כשאין ticket ועובדים לפי productId) ---
  const inProductMode = !!productId && !ticket;
  const [childTickets, setChildTickets] = useState([]);

  const aggregateStatus = (rows) => {
    if (!rows?.length) return "read";
    let agg = "read";
    for (const r of rows) {
      if (r.status === "unread") return "unread";
      if (agg !== "unread" && r.status === "progress") agg = "progress";
    }
    return agg;
  };

  const isReport  = inProductMode ? true : (ticket?.type_message === "report");
  const isGrouped = inProductMode || isReport;
  const canReply  = !isReport;
// מזההי הילדים (אם מגיעים מהלוח)

  const pid = inProductMode ? productId : ticket?.product_id;

  const [status, setStatus] = useState(ticket?.status || "unread");
  useEffect(() => {
    if (inProductMode) setStatus(aggregateStatus(childTickets));
  }, [inProductMode, childTickets]);

  const reporterMap = useMemo(() => {
    if (!isGrouped) return ticket?.reporterMap || {};
    if (!inProductMode) return ticket?.reporterMap || {};
    const map = {};
    for (const r of childTickets) {
      map[r.ticket_id] = { first_name: r.first_name, last_name: r.last_name, email: r.email };
    }
    return map;
  }, [isGrouped, inProductMode, ticket?.reporterMap, childTickets]);

  useEffect(() => {
    (async () => {
      if (!pid) return;
      try {
        const res = await adminFetchProduct(pid);
        setProdStatus(res?.product?.product_status || "");
      } catch {}
    })();
  }, [pid]);

  const isBlocked = String(prodStatus || "").trim().toLowerCase() === "blocked";

  // במצב מוצר: טוענים את הילדים של המוצר (לא מסוננים לפי סטטוס)
useEffect(() => {
  if (!isGrouped || !pid) return;
  let alive = true;
  (async () => {
    try {
      const res = await fetchProductReportTickets(pid);
      if (!alive) return;
      setChildTickets(res.tickets || []); // ← ילדים בלבד
    } catch {}
  })();
  return () => { alive = false; };
}, [isGrouped, pid]);

  // ===== טעינת הודעות לשרשור (כולל הערות פנימיות) =====
// ===== טעינת הודעות לשרשור (כולל הערות פנימיות) =====
useEffect(() => {
  if (!open) return;               // נטען רק כשהשיחה פתוחה
  let alive = true;

  (async () => {
    try {
      setLoadingMsgs(true);

      if (isGrouped) {
        // בוחרים מזהה כלשהו של השרשור (אב/בן) — במצב מוצר נדרשים הילדים
        const anyThreadTicketId = inProductMode
          ? (childTickets[0]?.ticket_id || null)
          : (ticket?.parentTicketId || ticket?.ticket_id || ticket?.ticketIds?.[0] || null);

        // אם עדיין אין מזהה – ממתינים לרענון (אל תדרסי ל־[])
        if (!anyThreadTicketId) return;

        const full = await fetchTicketMessages(anyThreadTicketId);
        if (!alive) return;
        const all = (full.messages || []).map(m => ({ ...m, _ticketId: m.ticket_id }));
        setMessages(all);
      } else {
        if (!ticket?.ticket_id) return;
        const res = await fetchTicketMessages(ticket.ticket_id);
        if (!alive) return;
        setMessages(res.messages || []);
      }
    } catch {
      if (!alive) return;
      setError("שגיאה בטעינת ההודעות");
    } finally {
      if (!alive) return;
      setLoadingMsgs(false);
    }
  })();

  return () => { alive = false; };
  // חשוב: לא לתלות ב-messages.length כדי לא ליצור ריצודים מיותרים
}, [
 open,
  isGrouped,
  inProductMode,
  childTickets,              // טוב להשאיר את כל המערך
  ticket?.ticket_id,
  ticket?.parentTicketId,
 ticket?.ticketIds,     
]);

// לוג כשכמות ההודעות משתנה – רק לדיבוג
useEffect(() => {
  console.log("כמות הודעות:", messages.length);
}, [messages.length]);

console.log("כמות הודעות", messages.length);



// גלילה לתחתית
  useEffect(() => {
    if (!open) return;
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [open, messages, loadingMsgs]);


const computedChildrenCount = useMemo(() => {
  if (!isGrouped || messages.length === 0) return null;
  const s = new Set(
    messages
      .filter(m => m.sender_role !== "system" && !m.is_internal)
      .map(m => m._ticketId || m.ticket_id)
  );
  return s.size;
}, [isGrouped, messages]);

// כמה ילדים בסה"כ (נקראו + לא נקראו)
const totalReportsCount = useMemo(() => {
  if (!isGrouped) return 0;

  // עדיפות: האמת מהשרת (הילדים שנטענו)
  if (childTickets.length) return childTickets.length;

  // גיבוי מהקיבוץ של הלוח (אם יש)
  if (Array.isArray(ticket?.ticketIds) && ticket.ticketIds.length) return ticket.ticketIds.length;
  if (typeof ticket?.reportersCount === "number") return ticket.reportersCount;
  if (typeof ticket?.reports_count === "number") return ticket.reports_count;

  // גיבוי אחרון מתוך הודעות שכבר נטענו (אם יש)
  if (typeof computedChildrenCount === "number") return computedChildrenCount;

  return 0;
}, [isGrouped, childTickets, ticket?.ticketIds, ticket?.reportersCount, ticket?.reports_count, computedChildrenCount]);
// כמה ילדים בסטטוס 'unread' (רק ילדים!)


const reportersCount = useMemo(() => {
  if (!isGrouped) return 0;

  // 1) מהקיבוץ שמגיע מהלוח (TicketsBoard)
  if (typeof ticket?.reportersCount === "number" && ticket.reportersCount > 0) {
    return ticket.reportersCount;
  }
  const mapLen = Object.keys(ticket?.reporterMap || {}).length;
  if (mapLen > 0) return mapLen;

  // 2) מתוך ההודעות שכבר נטענו (אב+ילדים)
  if (typeof computedChildrenCount === "number" && computedChildrenCount > 0) {
    return computedChildrenCount;
  }

  // 3) מצב מוצר: אורך הילדים מה-API
  if (inProductMode && childTickets.length > 0) return childTickets.length;

  // 4) ערך reports_count מהשרת אם קיים
  if (typeof ticket?.reports_count === "number") return ticket.reports_count;

  return 0;
}, [
 isGrouped,
  ticket?.reportersCount,
  ticket?.reporterMap,
  computedChildrenCount,
  inProductMode,
  childTickets,
 ticket?.reports_count,
]);


const newReportsCount = useMemo(() => {
  if (!isGrouped) return 0;
  return childTickets.filter(r => String(r.status) === "unread").length;
}, [isGrouped, childTickets]);

  
  const handleSaveStatus = async (newStatus) => {
    setError("");
    try {
      setSavingStatus(true);
      setStatus(newStatus);

      if (isGrouped) {
        let parentId = null;
        if (inProductMode) {
          parentId = childTickets[0]?.related_ticket_id || null;
        } else if (ticket) {
          parentId = ticket.related_ticket_id || ticket.parentTicketId || ticket.ticket_id || null;
        }

        if (parentId) {
          await updateTicketStatus(parentId, newStatus, { cascade: true });
        } else {
          const ids = inProductMode
            ? childTickets.map((t) => t.ticket_id)
            : (ticket?.ticketIds || []);
          const targetIds = ids.length ? ids : (ticket?.ticket_id ? [ticket.ticket_id] : []);
          await Promise.all(
            targetIds.map((tid) => updateTicketStatus(tid, newStatus, { cascade: true }))
          );
        }

        if (inProductMode) {
          setChildTickets((rows) => rows.map((r) => ({ ...r, status: newStatus })));
        }
        onStatusSaved?.(ticket?.ticket_id || parentId || "", newStatus);
      } else {
        await updateTicketStatus(ticket.ticket_id, newStatus);
        onStatusSaved?.(ticket.ticket_id, newStatus);
      }
    } catch {
      setError("שגיאה בעדכון הסטטוס");
      setStatus(ticket?.status || aggregateStatus(childTickets));
    } finally {
      setSavingStatus(false);
    }
  };

  const handleSend = async () => {
    if (!canReply) return;
    setError("");
    if (!reply.trim()) return;

    try {
      setSending(true);
      const res = await sendAdminMessage(ticket.ticket_id, reply.trim());
      setMailInfo(res?.mail || null);

      const r = await fetchTicketMessages(ticket.ticket_id);
      setMessages(r.messages || []);
      setReply("");

      if (status !== "read") await handleSaveStatus("read");
    } catch {
      setError("שגיאה בשליחת הודעה");
    } finally {
      setSending(false);
      setTimeout(() => setMailInfo(null), 3500);
    }
  };

  const handleSendToSeller = async () => {
    if (!pid || !isGrouped) return;
    setError("");
    if (!sellerMsg.trim()) return;

    try {
      setSendingSeller(true);
      const res = await adminSendMessageToSeller(pid, sellerMsg.trim(), null);
      setMailInfo(res?.mail || null);

      if (open) setMessages([]);
      setSellerMsg("");
      if (status !== "read") await handleSaveStatus("read");
    } catch {
      setError("שגיאה בשליחת הודעה למוכר");
    } finally {
      setSendingSeller(false);
      setTimeout(() => setMailInfo(null), 3500);
    }
  };

  const handleSaveAdminNote = async () => {
    const body = adminNote.trim();
    if (!body) return;
    try {
      setSavingNote(true);
      if (isGrouped) {
        const targetProductId = inProductMode ? productId : (ticket?.product_id);
        await adminAddInternalNoteByProduct(targetProductId, body);
      } else if (ticket?.ticket_id) {
        await adminAddInternalNoteByTicket(ticket.ticket_id, body);
      }
      setAdminNote("");
      if (open) setMessages([]);
    } catch {
      setError("שגיאה בשמירת הערת מנהל");
    } finally {
      setSavingNote(false);
    }
  };

  const handleBlockProduct = async () => {
    if (!pid) return;
    if (!window.confirm("לחסום את המוצר ולשלוח מייל לכל הנרשמים?")) return;
    try {
      setBlocking(true);
      setError("");
      setNotice("");
      await cancelProductSale(pid);
      setProdStatus("blocked");
      setNotice("המוצר נחסם ונשלחו מיילים לנרשמים.");
      setTimeout(() => setNotice(""), 3500);
    } catch {
      setError("שגיאה בעת חסימת המוצר");
    } finally {
      setBlocking(false);
    }
  };

  // --- עזרי תצוגה ---
  const statusClass =
    status === "unread" ? s.statusUnread :
    status === "progress" ? s.statusProgress :
    s.statusRead;


console.log(" כמות הודעות",reportersCount);
  //  מעדכנים את הלייבל של השולח כך שישתמש קודם במידע שמגיע בכל הודעה מהשרת (first_name/last_name/email),
  //   ואם אין — יפול ל-reporterMap.
  const senderLabel = (m) => {
    if (m.is_internal) return "הערת מנהל (פנימית)";
    if (!isGrouped) return m.sender_role === "system" ? "מנהל" : (m.email || "משתמש");
    if (m.sender_role === "system") return "מנהל";

    const nameFromMsg = `${m.first_name || ""} ${m.last_name || ""}`.trim();
    if (nameFromMsg || m.email) return nameFromMsg || m.email;

    const u = reporterMap?.[m._ticketId];
    const name = `${u?.first_name || ""} ${u?.last_name || ""}`.trim();
    return name || u?.email || "משתמש";
  };

  const avatarText = (m) => {
    if (m.is_internal) return "ה";
    if (m.sender_role === "system") return "מ";
    const label = senderLabel(m) || "";
    return (label[0] || "מ").toUpperCase();
  };

const reportersLine = isGrouped
  ? (status === "unread"
      ? `דיווחים חדשים: ${newReportsCount}`
      : `כמות דיווחים כוללת: ${totalReportsCount}`)
  : `${ticket?.first_name} ${ticket?.last_name} · ${ticket?.email}`;

  const statusLabel =
    status === "unread" ? "לא טופל" :
    status === "progress" ? "בטיפול" : "טופל";

  const titleText = isGrouped
    ? `דיווחים והודעות על מוצר #${pid || ticket?.product_id}`
    : (ticket?.subject || "");

  return (
    <div className={`${s.card} ${isReport ? s.cardReport : s.cardGeneral}`} dir="rtl">
      {/* כותרת */}
      <div className={s.header}>
        <div className={s.headerTop}>
          <div className={s.titleWrap}>
            <span className={s.titleIcon} aria-hidden>🧾</span>
            <strong className={s.subject}>{titleText}</strong>
          </div>

          <div className={s.chips}>
            <span className={`${s.badge} ${s.type}`}>{isReport ? "דיווח" : "כללי"}</span>
            <span className={`${s.badge} ${statusClass}`}>
              <span className={s.statusDot} /> {statusLabel}
            </span>
            {(pid || ticket?.product_id) && (
              <Link className={s.productChip} to={`/product/${pid || ticket?.product_id}`}>
                מוצר #{pid || ticket?.product_id}
              </Link>
            )}
          </div>
        </div>

        <div className={s.headerBottom}>
          <div className={s.meta}>
            {reportersLine}
            {(ticket?.created_at || ticket?.updated_at) && (
              <>
                <span className={s.dot}>•</span>
                נוצרה: {new Date(ticket.created_at || ticket.updated_at).toLocaleString("he-IL")}
              </>
            )}
          </div>

          <div className={s.statusRow}>
            <label className={s.label}>סטטוס:</label>
            <select
              className={s.select}
              disabled={savingStatus}
              value={status}
              onChange={(e) => handleSaveStatus(e.target.value)}
            >
              <option value="unread">לא טופל</option>
              <option value="progress">בטיפול</option>
              <option value="read">טופל</option>
            </select>

            <button
              type="button"
              className={s.toggleBtn}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? "סגור שיחה" : "פתח שיחה"}
            </button>
          </div>

        
        {/* חסימת מוצר */}
{pid && prodStatus !== "sale" && prodStatus !== "blocked" && (
  <div style={{ marginTop: 10 }}>
    {isBlocked ? (
      <div style={{ padding: "10px 12px", background: "#fff8e1", border: "1px solid #ffe082", borderRadius: 8 }}>
        המוצר נחסם ולא נמצא במערכת יותר.
      </div>
    ) : (
      <button
        className={`${s.sendBtn} ${s.danger}`}
        style={{ marginTop: 4, padding: "6px 12px" }}
        disabled={blocking}
        onClick={handleBlockProduct}
      >
        חסימת מוצר (מייל לכל הנרשמים)
      </button>
    )}
    {notice && <div className={s.mailNote} style={{ marginTop: 6 }}>{notice}</div>}
  </div>
)}

        </div>
      </div>

      {/* שרשור */}
      {open && (
        <div className={s.threadWrap}>
          {loadingMsgs ? (
            <div className={s.loading}>טוען הודעות…</div>
          ) : (
            <>
              <div className={s.thread} ref={threadRef}>
                {messages.length === 0 ? (
                  <div className={s.empty}>
                    {isGrouped ? "אין הודעות עדיין (אין דיווחים/הודעות/הערות)." : "אין הודעות עדיין."}
                  </div>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.message_id}
                      className={
                        `${s.msg} ${
                          m.is_internal
                            ? s.msgInternal
                            : (m.sender_role === "system" ? s.msgSystem : s.msgUser)
                        }`
                      }
                    >
                      <div className={s.msgAvatar} title={senderLabel(m)}>{avatarText(m)}</div>
                      <div className={s.msgBodyWrap}>
                        <div className={s.msgHeader}>
                          <span className={s.msgSender}>{senderLabel(m)}</span>
                          <span className={s.msgTime}>{new Date(m.created_at).toLocaleString("he-IL")}</span>
                        </div>
                        <div className={s.msgBubble}>
                          <div className={s.msgBody}>{m.body}</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* מענה למשתמש — רק ב"כללי" */}
              {(!isReport && ticket) && (
                <div className={s.replyRow}>
                  <textarea
                    className={s.textarea}
                    rows={3}
                    placeholder="כתבו תשובה למשתמש…"
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                  />
                  <div className={s.replyActions}>
                    <button className={s.sendBtn} onClick={handleSend} disabled={sending || !reply.trim()}>
                      שליחת מענה
                    </button>
                    {sending && <small className={s.sending}>שולח…</small>}
                  </div>
                </div>
              )}

              {/* הודעה למוכר — בכרטיס דיווח מקובץ/מוצר */}
              {isGrouped && (
                <div className={s.replyRow}>
                  <textarea
                    className={s.textarea}
                    rows={3}
                    placeholder="כתבו הודעה למוכר…"
                    value={sellerMsg}
                    onChange={(e) => setSellerMsg(e.target.value)}
                  />
                  <div className={s.replyActions}>
                    <button
                      className={s.sendBtn}
                      onClick={handleSendToSeller}
                      disabled={sendingSeller || !sellerMsg.trim()}
                    >
                      שליחת הודעה למוכר
                    </button>
                    {sendingSeller && <small className={s.sending}>שולח…</small>}
                    {mailInfo && (
                      <small className={s.mailNote}>
                        {mailInfo.sent ? " נשלח גם למייל המוכר" : ` מייל לא נשלח: ${mailInfo.reason || "בדקי הגדרות SMTP/Gmail בשרת"}`}
                      </small>
                    )}
                  </div>
                </div>
              )}

              {/* הערת מנהל (פנימית) */}
              <div className={s.replyRow}>
                <textarea
                  className={s.textarea}
                  rows={3}
                  placeholder="הערת מנהל (פנימית, לא נשלח לאיש)…"
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                />
                <div className={s.replyActions}>
                  <button
                    className={s.sendBtn}
                    onClick={handleSaveAdminNote}
                    disabled={savingNote || !adminNote.trim()}
                  >
                    שמירת הערה פנימית
                  </button>
                  {savingNote && <small className={s.sending}>שומר…</small>}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {error && <div className={s.error}>{error}</div>}
    </div>
  );
}
