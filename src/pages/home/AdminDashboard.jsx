import styles from "./AdminDashboard.module.css";
import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { getAdminStats } from "../../services/adminApi";
import CustomModal from "../../components/CustomModal/CustomModal";
import {
  fetchAllMessages,
  saveMessageReply,
} from "../../services/adminMessagesApi";

function AdminDashboard() {
  const [stats, setStats] = useState({
    totalSellers: 0,
    totalUsers: 0,
    deliveredSales: 0,
    undeliveredSales: 0,
    upcomingProducts: 0,
    unsoldProducts: 0,
  });
  const [modalData, setModalData] = useState(null);

  const [messages, setMessages] = useState([]);

  useEffect(() => {
    async function fetchStats() {
      const data = await getAdminStats();
      if (data) setStats(data);
    }
    fetchStats();
  }, []);

  // פניות אחרונות של משתמשים
  useEffect(() => {
    fetchAllMessages().then((data) => {
      const sorted = data.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
      setMessages(sorted);
    });
  }, []);

  const handleReply = (msg) => {
    setModalData(msg);
  };


  //שינוי סטטוס לפניות 
  const handleStatusChange = async (id, newStatus) => {
    try {
      const msgToUpdate = messages.find((m) => m.id === id);
      if (!msgToUpdate) return;

      const updatedMessage = {
        ...msgToUpdate,
        status: newStatus,
        sender_role: msgToUpdate.sender_role,
        is_admin_message: msgToUpdate.is_admin_message,
        reply_sent: msgToUpdate.reply_sent,
      };

      await saveMessageReply(id, updatedMessage);

      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: newStatus } : m))
      );
    } catch (err) {
      console.error("שגיאה בעדכון סטטוס:", err);
    }
  };

  //שמירת תגובת מנהל לפנייה
  const handleSave = async () => {
    const updated = {
      ...modalData,
      reply_sent: true,
    };

    try {
      await saveMessageReply(modalData.id, updated);
      setMessages((prev) =>
        prev.map((m) => (m.id === updated.id ? updated : m))
      );
      setModalData(null);
    } catch (err) {
      console.error("שגיאה בשמירת תשובה:", err);
    }
  };

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <h1>BIDSMART לוח בקרה </h1>
          <div className={styles.statsGrid}>
            <div className={styles.card}>
              <h3>סה״כ מוכרים</h3>
              <p>{stats.totalSellers}</p>
            </div>
            <div className={styles.card}>
              <h3>סה״כ משתמשים</h3>
              <p>{stats.totalUsers}</p>
            </div>
            <div className={styles.card}>
              <h3>מוצרים שנמכרו והגיעו לרוכש</h3>
              <p>{stats.deliveredSales}</p>
            </div>
            <div className={styles.card}>
              <h3>מוצרים שנמכרו וטרם הגיעו לרוכש</h3>
              <p>{stats.undeliveredSales}</p>
            </div>
            <div className={styles.card}>
              <h3>מוצרים פעילים שטרם התחילו</h3>
              <p>{stats.upcomingProducts}</p>
            </div>
            <div className={styles.card}>
              <h3>מוצרים שלא נמכרו</h3>
              <p>{stats.unsoldProducts}</p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.quickLinks}>
        <h3>:קישורים מהירים</h3>
        <ul>
          <li>
            <Link to="/admin/categories">ניהול קטגוריות</Link>
          </li>
          <li>
            <Link to="/admin/users">ניהול משתמשים</Link>
          </li>
          <li>
            <Link to="/admin/products">ניהול מוצרים</Link>
          </li>
          <li>
            <Link to="/admin/messages">פניות משתמשים</Link>
          </li>
          <li>
            <Link to="/admin/stats">סטטיסטיקות</Link>
          </li>
        </ul>
      </section>

      <section className={styles.messagesSection}>
        <h3>:פניות אחרונות</h3>
        {messages.length > 0 ? (
          <ul className={styles.messageList}>
            {messages
              .filter((msg) => msg.sender_role !== "admin")
              .map((msg) => (
                <li key={msg.id} className={styles.messageItem}>
                  <div className={styles.messageHeader}>
                    <span className={styles.subject}>{msg.subject}</span>
                    <span className={styles.date}>
                      {new Date(msg.created_at).toLocaleString("he-IL")}
                    </span>
                  </div>
                  <div className={styles.details}>
                    {msg.first_name} {msg.last_name} ({msg.email})
                    {!msg.reply_sent && (
                      <span className={styles.unreplied}>טרם נענתה</span>
                    )}
                    {msg.reply_sent === 1 && msg.status === "resolved" && (
                      <span className={styles.replied}>
                        פנייה נענתה והסתיימה
                      </span>
                    )}
                    {msg.reply_sent === 1 && msg.status === "in_progress" && (
                      <span className={styles.replied}>פנייה בטיפול</span>
                    )}
                  </div>
                  <select
                    value={msg.status}
                    onChange={(e) => handleStatusChange(msg.id, e.target.value)}
                  >
                    <option value="new" disabled>
                      חדש
                    </option>
                    <option value="in_progress">בטיפול</option>
                    <option value="resolved">נפתר</option>
                  </select>

                  <button
                    className={styles.replyBtn}
                    onClick={() => handleReply(msg)}
                  >
                    השב
                  </button>
                </li>
              ))}
          </ul>
        ) : (
          <p>אין פניות להצגה</p>
        )}
        <div className={styles.viewAllLink}>
          <Link to="/admin/messages">לכל הפניות </Link>
        </div>
      </section>
      {modalData && (
        <CustomModal
          title={`מענה לפנייה #${modalData.id}`}
          message={
            <div dir="rtl">
              <p>
                <strong>שם:</strong> {modalData.first_name}{" "}
                {modalData.last_name}
              </p>
              <p>
                <strong>אימייל:</strong> {modalData.email}
              </p>
              <p>
                <strong>נושא:</strong> {modalData.subject}
              </p>
              <p>
                <strong>הודעה:</strong> {modalData.message}
              </p>

              <label>סטטוס:</label>
              <select
                value={modalData.status}
                onChange={(e) =>
                  setModalData({ ...modalData, status: e.target.value })
                }
              >
                <option value="new">חדש</option>
                <option value="in_progress">בטיפול</option>
                <option value="resolved">נפתר</option>
              </select>

              <label>תשובת מנהל:</label>
              <textarea
                rows={4}
                value={modalData.admin_reply || ""}
                onChange={(e) =>
                  setModalData({ ...modalData, admin_reply: e.target.value })
                }
              />
            </div>
          }
          confirmText="שמור"
          cancelText="סגור"
          onConfirm={handleSave}
          onCancel={() => setModalData(null)}
        />
      )}
    </div>
  );
}

export default AdminDashboard;
