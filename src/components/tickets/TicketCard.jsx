// src/components/tickets/TicketCard.jsx
import React, { useEffect, useRef, useState } from "react";
import {
  fetchTicketMessages,
  updateTicketStatus,
  sendAdminMessage,          // למענה למשתמשים "כללי"
  adminSendMessageToSeller,  // מענה למוכר
} from "../../services/contactApi";
import { Link } from "react-router-dom";
import s from "./TicketCard.module.css";

export default function TicketCard({ ticket, onStatusSaved }) {
  const [open, setOpen] = useState(false);

  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [messages, setMessages] = useState([]);

  const [status, setStatus] = useState(ticket.status || "unread");
  const [savingStatus, setSavingStatus] = useState(false);

  // תשובה למשתמש (כללי)
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  // תשובה למוכר (בדיווחים מקובצים)
  const [sellerMsg, setSellerMsg] = useState("");
  const [linkToTid, setLinkToTid] = useState("");      // ticket_id לקישור
  const [sendingSeller, setSendingSeller] = useState(false);

  const [error, setError] = useState("");
  const [mailInfo, setMailInfo] = useState(null);

  const threadRef = useRef(null);

  const isReport  = ticket.type_message === "report";
  const isGrouped = Boolean(ticket.isGroupedReport);
  const canReply  = !isReport; // מענה למשתמשים רק ב"כללי"

  // ברירת מחדל: קישור לטיקט הראשון בקבוצה
  useEffect(() => {
    if (isGrouped && !linkToTid && Array.isArray(ticket.ticketIds) && ticket.ticketIds.length) {
      setLinkToTid(ticket.ticketIds[0]);
    }
  }, [isGrouped, ticket.ticketIds, linkToTid]);

  // טעינת הודעות
  useEffect(() => {
    if (!open || messages.length > 0) return;

    (async () => {
      try {
        setLoadingMsgs(true);

        if (isGrouped) {
          // 1) כל הודעות הילדים בלבד (scope=self)
          const ids = ticket.ticketIds || [];
          const childs = await Promise.all(
            ids.map(async (tid) => {
              const res = await fetchTicketMessages(tid, { scope: "self" });
              return (res.messages || []).map((m) => ({ ...m, _ticketId: tid }));
            })
          );
          const childMsgs = childs.flat();

          // 2) הודעות מנהל שנרשמו על ההורה (כדי שיופיע מה ששלחנו למוכר)
          // נעדיף להשתמש ב-parentTicketId אם הגיע מלמעלה; אחרת ניקח דגימה מהילד הראשון.
          let adminParentMsgs = [];
          const parentId = ticket.parentTicketId || null;

          if (parentId) {
            const full = await fetchTicketMessages(parentId); // מחזיר אב+ילדים
            adminParentMsgs = (full.messages || []).filter(
              (m) => m.sender_role === "system" && m.ticket_id === parentId
            ).map((m) => ({ ...m, _ticketId: parentId })); // תגית לזיהוי
          } else if (ids.length) {
            const full = await fetchTicketMessages(ids[0]); // גם מחזיר אב+כל הילדים
            adminParentMsgs = (full.messages || []).filter(
              (m) => m.sender_role === "system" && !ticket.reporterMap?.[m.ticket_id] // לא ילד → כנראה האב
            ).map((m) => ({ ...m, _ticketId: "PARENT" }));
          }

          // 3) איחוד ומיון כרונולוגי
          const combined = [...childMsgs, ...adminParentMsgs].sort(
            (a, b) => new Date(a.created_at) - new Date(b.created_at)
          );

          setMessages(combined);
        } else {
          const res = await fetchTicketMessages(ticket.ticket_id);
          setMessages(res.messages || []);
        }
      } catch {
        setError("שגיאה בטעינת ההודעות");
      } finally {
        setLoadingMsgs(false);
      }
    })();
  }, [open, isGrouped, ticket.ticket_id, ticket.ticketIds, ticket.parentTicketId, ticket.reporterMap, messages.length]);

  // גלילה לתחתית
  useEffect(() => {
    if (!open) return;
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [open, messages, loadingMsgs]);

  // עדכון סטטוס
  const handleSaveStatus = async (newStatus) => {
    setError("");
    try {
      setSavingStatus(true);
      setStatus(newStatus);

      if (isGrouped) {
        await Promise.all((ticket.ticketIds || []).map((tid) => updateTicketStatus(tid, newStatus)));
      } else {
        await updateTicketStatus(ticket.ticket_id, newStatus);
      }

      onStatusSaved?.(ticket.ticket_id, newStatus);
    } catch {
      setError("שגיאה בעדכון הסטטוס");
      setStatus(ticket.status || "unread");
    } finally {
      setSavingStatus(false);
    }
  };

  // שליחת תשובה למשתמש (טיקט "כללי")
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

  // שליחת הודעה למוכר (בדיווח מקובץ)
  const handleSendToSeller = async () => {
    if (!isGrouped || !ticket.product_id) return;
    setError("");
    if (!sellerMsg.trim()) return;

    try {
      setSendingSeller(true);
      const res = await adminSendMessageToSeller(
        ticket.product_id,
        sellerMsg.trim(),
        linkToTid || null
      );
      setMailInfo(res?.mail || null);

      // רענון: שוב נביא ילדים + הודעות מנהל של האב (כמו בטעינה)
      const ids = ticket.ticketIds || [];
      const childs = await Promise.all(
        ids.map(async (tid) => {
          const r = await fetchTicketMessages(tid, { scope: "self" });
          return (r.messages || []).map((m) => ({ ...m, _ticketId: tid }));
        })
      );
      const childMsgs = childs.flat();

      let adminParentMsgs = [];
      const parentId = ticket.parentTicketId || null;
      if (parentId) {
        const full = await fetchTicketMessages(parentId);
        adminParentMsgs = (full.messages || []).filter(
          (m) => m.sender_role === "system" && m.ticket_id === parentId
        ).map((m) => ({ ...m, _ticketId: parentId }));
      } else if (ids.length) {
        const full = await fetchTicketMessages(ids[0]);
        adminParentMsgs = (full.messages || []).filter(
          (m) => m.sender_role === "system" && !ticket.reporterMap?.[m.ticket_id]
        ).map((m) => ({ ...m, _ticketId: "PARENT" }));
      }

      const combined = [...childMsgs, ...adminParentMsgs].sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at)
      );
      setMessages(combined);

      setSellerMsg("");
      if (status !== "read") await handleSaveStatus("read");
    } catch {
      setError("שגיאה בשליחת הודעה למוכר");
    } finally {
      setSendingSeller(false);
      setTimeout(() => setMailInfo(null), 3500);
    }
  };

  const statusClass =
    status === "unread" ? s.statusUnread :
    status === "progress" ? s.statusProgress :
    s.statusRead;

  const reportersLine = isGrouped
    ? `דיווחים: ${ticket.reportersCount} משתמשים`
    : `${ticket.first_name} ${ticket.last_name} · ${ticket.email}`;

  const senderLabel = (m) => {
    if (!isGrouped) return m.sender_role === "system" ? "מנהל" : "משתמש";
    if (m.sender_role === "system") return "מנהל";
    const u = ticket.reporterMap?.[m._ticketId];
    const name = `${u?.first_name || ""} ${u?.last_name || ""}`.trim();
    return u?.email || "משתמש";
  };

  const avatarText = (m) => {
    if (m.sender_role === "system") return "מ";
    const label = senderLabel(m) || "";
    return (label[0] || "מ").toUpperCase();
  };

  const statusLabel =
    status === "unread" ? "לא טופל" :
    status === "progress" ? "בטיפול" : "טופל";

  return (
    <div className={`${s.card} ${isReport ? s.cardReport : s.cardGeneral}`} dir="rtl">
      {/* כותרת */}
      <div className={s.header}>
        <div className={s.headerTop}>
          <div className={s.titleWrap}>
            <span className={s.titleIcon} aria-hidden>🧾</span>
            <strong className={s.subject}>
              {isGrouped ? `דיווחים על מוצר #${ticket.product_id}` : ticket.subject}
            </strong>
          </div>

          <div className={s.chips}>
            <span className={`${s.badge} ${s.type}`}>{isReport ? "דיווח" : "כללי"}</span>
            <span className={`${s.badge} ${statusClass}`}>
              <span className={s.statusDot} /> {statusLabel}
            </span>
            {ticket.product_id && (
              <Link className={s.productChip} to={`/product/${ticket.product_id}`}>
                מוצר #{ticket.product_id}
              </Link>
            )}
          </div>
        </div>

        <div className={s.headerBottom}>
          <div className={s.meta}>
            {reportersLine}
            <span className={s.dot}>•</span>
            נוצרה: {new Date(ticket.created_at).toLocaleString("he-IL")}
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
                  <div className={s.empty}>אין הודעות עדיין.</div>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.message_id}
                      className={`${s.msg} ${m.sender_role === "system" ? s.msgSystem : s.msgUser}`}
                    >
                      <div className={s.msgAvatar} title={senderLabel(m)}>
                        {avatarText(m)}
                      </div>

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
              {canReply && (
                <div className={s.replyRow}>
                  <textarea
                    className={s.textarea}
                    rows={3}
                    placeholder="כתבו תשובה למשתמש…"
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                  />
                  <div className={s.replyActions}>
                    <button
                      className={s.sendBtn}
                      onClick={handleSend}
                      disabled={sending || !reply.trim()}
                    >
                      שליחת מענה
                    </button>
                    {sending && <small className={s.sending}>שולח…</small>}
                  </div>
                </div>
              )}

              {/* הודעה למוכר — רק בכרטיס קיבוץ דיווחים */}
              {isGrouped && (
                <div className={s.replyRow}>
                  <div className={s.fieldRow}>
                    <label className={s.label}>קשר לטיקט של המדווח (אופציונלי):</label>
                    <select
                      className={s.select}
                      value={linkToTid}
                      onChange={(e) => setLinkToTid(e.target.value)}
                    >
                      {(ticket.ticketIds || []).map((tid) => {
                        const u = ticket.reporterMap?.[tid];
                        const name = `${u?.first_name || ""} ${u?.last_name || ""}`.trim();
                        return (
                          <option key={tid} value={tid}>
                            {name || u?.email || "משתמש לא מזוהה"} · #{tid.slice(0, 8)}
                          </option>
                        );
                      })}
                      <option value="">ללא קישור (טיקט אב)</option>
                    </select>
                  </div>

                  <textarea
                    className={s.textarea}
                    rows={3}
                    placeholder="כתבי הודעה למוכר…"
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
                        {mailInfo.sent
                          ? "✅ נשלח גם למייל המוכר"
                          : `⚠️ מייל לא נשלח: ${mailInfo.reason || "בדקי הגדרות SMTP/Gmail בשרת"}`}
                      </small>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {error && <div className={s.error}>{error}</div>}
    </div>
  );
}
