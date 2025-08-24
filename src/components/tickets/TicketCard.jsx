// src/components/tickets/TicketCard.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  fetchTicketMessages,
  updateTicketStatus,
  sendAdminMessage,            // מענה למשתמשים "כללי"
  adminSendMessageToSeller,    // מענה למוכר (נרשם תמיד על האב)
  fetchProductReportTickets,   // הבאת הילדים לפי מוצר
  adminAddInternalNoteByProduct, // הערת מנהל פנימית לפי מוצר (על האב)
  adminAddInternalNoteByTicket,  // הערת מנהל פנימית לטיקט בודד
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
  const [childTickets, setChildTickets] = useState([]); // ילדים של report למוצר

  // מצטבר סטטוסים מן הילדים
  const aggregateStatus = (rows) => {
    if (!rows?.length) return "read";
    let agg = "read";
    for (const r of rows) {
      if (r.status === "unread") return "unread";
      if (agg !== "unread" && r.status === "progress") agg = "progress";
    }
    return agg;
  };

  // זיהוי מצב הכרטיס
  const isReport  = inProductMode ? true : (ticket?.type_message === "report");
  const isGrouped = inProductMode ? true : Boolean(ticket?.isGroupedReport);
  const canReply  = !isReport; // מענה טקסטואלי למשתמשים רק ב"כללי"

  const pid = inProductMode ? productId : ticket?.product_id;

  // סטטוס תצוגה
  const [status, setStatus] = useState(ticket?.status || "unread");
  useEffect(() => {
    if (inProductMode) setStatus(aggregateStatus(childTickets));
  }, [inProductMode, childTickets]);

  // מפת מדווחים להצגה
  const reporterMap = useMemo(() => {
    if (!isGrouped) return ticket?.reporterMap || {};
    if (!inProductMode) return ticket?.reporterMap || {};
    const map = {};
    for (const r of childTickets) {
      map[r.ticket_id] = { first_name: r.first_name, last_name: r.last_name, email: r.email };
    }
    return map;
  }, [isGrouped, inProductMode, ticket?.reporterMap, childTickets]);

  // סטטוס מוצר (לחסימה)
  useEffect(() => {
    (async () => {
      if (!pid) return;
      try {
        const res = await adminFetchProduct(pid);
        setProdStatus(res?.product?.product_status || "");
      } catch { /* מתעלמים בשקט */ }
    })();
  }, [pid]);

  const isBlocked = String(prodStatus || "").trim().toLowerCase() === "blocked";

  // במצב מוצר: טוענים את הילדים (reports) של המוצר
  useEffect(() => {
    if (!inProductMode) return;
    let alive = true;
    (async () => {
      try {
        const res = await fetchProductReportTickets(productId);
        if (!alive) return;
        setChildTickets(res.tickets || []);
      } catch { /* נתעלם; יוצג "אין הודעות" */ }
    })();
    return () => { alive = false; };
  }, [inProductMode, productId]);

  // טעינת הודעות לשרשור (כולל הערות פנימיות)
  useEffect(() => {
    if (!open || messages.length > 0) return;
    (async () => {
      try {
        setLoadingMsgs(true);

        if (isGrouped) {
          // מזהי הילדים
          const ids = inProductMode
            ? childTickets.map((t) => t.ticket_id)
            : (ticket?.ticketIds || []);

          // 1) הודעות ילדים בלבד (scope=self)
          const childs = await Promise.all(
            ids.map(async (tid) => {
              const res = await fetchTicketMessages(tid, { scope: "self" });
              return (res.messages || []).map((m) => ({ ...m, _ticketId: tid }));
            })
          );
          const childMsgs = childs.flat();

          // 2) הודעות הורה: מנהל + הערות פנימיות (לא שייכות לאחד הילדים)
          let parentMsgs = [];
          if (ids.length) {
            const full = await fetchTicketMessages(ids[0]); // אב + ילדים
            parentMsgs = (full.messages || [])
              .filter((m) => !ids.includes(m.ticket_id))
              .filter((m) => m.sender_role === "system" || !!m.is_internal)
              .map((m) => ({ ...m, _ticketId: "PARENT" }));
          }

          setMessages(
            [...childMsgs, ...parentMsgs].sort(
              (a, b) => new Date(a.created_at) - new Date(b.created_at)
            )
          );
        } else {
          // טיקט בודד (כללי): כל ההודעות של הטיקט (כולל is_internal)
          const res = await fetchTicketMessages(ticket.ticket_id);
          setMessages(res.messages || []);
        }
      } catch {
        setError("שגיאה בטעינת ההודעות");
      } finally {
        setLoadingMsgs(false);
      }
    })();
    // נרענן גם כשמס׳ ההודעות משתנה, או כשילדים התעדכנו
  }, [open, isGrouped, inProductMode, childTickets, ticket?.ticket_id, ticket?.ticketIds, messages.length]);

  // גלילה לתחתית עם שינוי הודעות
  useEffect(() => {
    if (!open) return;
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [open, messages, loadingMsgs]);

  // עדכון סטטוס (בודד/קבוצה)
  const handleSaveStatus = async (newStatus) => {
    setError("");
    try {
      setSavingStatus(true);
      setStatus(newStatus);

      if (isGrouped) {
        const ids = inProductMode
          ? childTickets.map((t) => t.ticket_id)
          : (ticket?.ticketIds || []);
        await Promise.all(ids.map((tid) => updateTicketStatus(tid, newStatus)));
        if (inProductMode) {
          setChildTickets((rows) => rows.map((r) => ({ ...r, status: newStatus })));
        }
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

  // מענה למשתמש (כללי)
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

  // הודעה למוכר — תמיד לאב
  const handleSendToSeller = async () => {
    if (!pid || !isGrouped) return;
    setError("");
    if (!sellerMsg.trim()) return;

    try {
      setSendingSeller(true);
      const res = await adminSendMessageToSeller(pid, sellerMsg.trim(), null);
      setMailInfo(res?.mail || null);

      // רענון השרשור
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

  // הערת מנהל פנימית — לא נשלחת
  const handleSaveAdminNote = async () => {
    const body = adminNote.trim();
    if (!body) return;
    try {
      setSavingNote(true);
      if (isGrouped) {
        // דיווחים מקובצים / מצב מוצר → לפי מוצר (על האב)
        const targetProductId = inProductMode ? productId : (ticket?.product_id);
        await adminAddInternalNoteByProduct(targetProductId, body);
      } else if (ticket?.ticket_id) {
        // טיקט "כללי" בודד
        await adminAddInternalNoteByTicket(ticket.ticket_id, body);
      }
      setAdminNote("");
      // כדי לטעון שוב את השרשור (ה־effect יופעל כשmessages.length=0)
      if (open) setMessages([]);
    } catch {
      setError("שגיאה בשמירת הערת מנהל");
    } finally {
      setSavingNote(false);
    }
  };

  // חסימת מוצר
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

  const reportersCount = inProductMode
    ? childTickets.length
    : (ticket?.reportersCount || 0);

  const reportersLine = isGrouped
    ? `דיווחים: ${reportersCount} משתמשים`
    : `${ticket?.first_name} ${ticket?.last_name} · ${ticket?.email}`;

  const senderLabel = (m) => {
    if (m.is_internal) return "הערת מנהל (פנימית)";
    if (!isGrouped) return m.sender_role === "system" ? "מנהל" : "משתמש";
    if (m.sender_role === "system") return "מנהל";
    const u = reporterMap?.[m._ticketId];
    const name = `${u?.first_name || ""} ${u?.last_name || ""}`.trim();
    return name || u?.email || "משתמש";
  };

  const avatarText = (m) => {
    if (m.is_internal) return "ה"; // הערה פנימית
    if (m.sender_role === "system") return "מ";
    const label = senderLabel(m) || "";
    return (label[0] || "מ").toUpperCase();
  };

  const statusLabel =
    status === "unread" ? "לא טופל" :
    status === "progress" ? "בטיפול" : "טופל";

  const titleText = isGrouped
    ? `דיווחים על מוצר #${pid || ticket?.product_id}`
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

          {/* חסימת מוצר – מוצג אם יש product id */}
          {pid && (
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
                        {mailInfo.sent ? "✅ נשלח גם למייל המוכר" : `⚠️ מייל לא נשלח: ${mailInfo.reason || "בדקי הגדרות SMTP/Gmail בשרת"}`}
                      </small>
                    )}
                  </div>
                </div>
              )}

              {/* הערת מנהל (פנימית) – לא נשלחת לאיש */}
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
