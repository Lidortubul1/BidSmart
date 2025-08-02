import { useEffect, useState } from "react";
import styles from "./AdminMessages.module.css";

import CustomModal from "../../components/CustomModal/CustomModal";
import {
  fetchAllMessages,
  saveMessageReply,
  sendNewMessageToUser,
  deleteMessageById,
  fetchUserEmails,
} from "../../services/adminMessagesApi";

function AdminMessages() {
  const [messages, setMessages] = useState([]);
  const [modalData, setModalData] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [senderFilter, setSenderFilter] = useState("user"); // ברירת מחדל – רק משתמשים
  const [deleteModal, setDeleteModal] = useState({
    show: false,
    messageId: null,
  });
  const [userEmails, setUserEmails] = useState([]);
  const [replyFilter, setReplyFilter] = useState("all"); // "all", "active", "unactive"
  const [confirmSendModal, setConfirmSendModal] = useState({
    show: false,
    onConfirm: null,
  });

  //שליפת מיילים של משתמשים בשביל פנייה של מנהל למשתמש
  useEffect(() => {
    fetchUserEmails()
      .then(setUserEmails)
      .catch((err) => console.error("שגיאה בשליפת המיילים:", err));
  }, []);

  const confirmDelete = (id) => {
    setDeleteModal({ show: true, messageId: id });
  };

  useEffect(() => {
    fetchAllMessages().then((data) => {
      const sorted = data.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
      setMessages(sorted);
    });
  }, []);

  const handleOpen = (msg) => {
    console.log("פתיחת פנייה:", msg);
    setModalData(msg);
  };

  //שמירת תגובת מנהל לפנייה

  const handleSave = async () => {
    setConfirmSendModal({
      show: true,
      onConfirm: async () => {
        const updated = {
          email: modalData.email,
          subject: modalData.subject,
          message: modalData.message,
          status: modalData.status || "new",
          reply_sent: true,
          admin_reply: modalData.admin_reply || "",
          is_admin_message: 1,
          sender_role: "admin",
        };

        try {
          if (modalData.isNew) {
            const created = await sendNewMessageToUser(updated);
            setMessages((prev) => [created, ...prev]);
          } else {
            await saveMessageReply(modalData.id, updated);

            setMessages((prev) =>
              prev.map((m) =>
                m.id === modalData.id
                  ? {
                      ...m,
                      admin_reply: updated.admin_reply,
                      reply_sent: true,
                      status: updated.status,
                    }
                  : m
              )
            );
          }

          setModalData(null);
          setConfirmSendModal({ show: false, onConfirm: null });
        } catch (err) {
          console.error("שגיאה בשמירת הודעה:", err);
          setConfirmSendModal({ show: false, onConfirm: null });
        }
      },
    });
  };

  //מחיקת פנייה של מנהל
  const handleDelete = async (id) => {
    try {
      await deleteMessageById(id); // ← קריאה לשרת

      setMessages((prev) => prev.filter((m) => m.id !== id));
      setDeleteModal({ show: false, messageId: null });
    } catch (err) {
      console.error("שגיאה במחיקת ההודעה:", err);
    }
  };
  //בחירת סטטוס לרשומה
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

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>
        ניהול פניות:{" "}
        {senderFilter === "user"
          ? "משתמשים"
          : senderFilter === "admin"
          ? "מנהל"
          : "הכל"}
      </h2>
      <button
        className={styles.newMessageBtn}
        onClick={() =>
          setModalData({
            isNew: true,
            id: "טיוטה",
            first_name: "",
            last_name: "",
            email: "",
            subject: "",
            message: "",
            status: "new",
            admin_reply: "",
            reply_sent: false,
            is_admin_message: 1,
            sender_role: "admin",
          })
        }
      >
        שלח הודעה חדשה
      </button>

      <div className={styles.filters}>
        <button
          className={senderFilter === "user" ? styles.active : ""}
          onClick={() => setSenderFilter("user")}
        >
          פניות מהמשתמשים
        </button>
        <button
          className={senderFilter === "admin" ? styles.active : ""}
          onClick={() => setSenderFilter("admin")}
        >
          פניות מהמנהל
        </button>
      </div>
      {senderFilter === "user" && (
        <div className={styles.filters}>
          <button
            className={statusFilter === "all" ? styles.active : ""}
            onClick={() => setStatusFilter("all")}
          >
            כל הסטטוסים
          </button>
          <button
            className={statusFilter === "new" ? styles.active : ""}
            onClick={() => setStatusFilter("new")}
          >
            סטטוס: חדש
          </button>
          <button
            className={statusFilter === "in_progress" ? styles.active : ""}
            onClick={() => setStatusFilter("in_progress")}
          >
            סטטוס: בטיפול
          </button>
          <button
            className={statusFilter === "resolved" ? styles.active : ""}
            onClick={() => setStatusFilter("resolved")}
          >
            סטטוס: נפתר
          </button>
        </div>
      )}
      {senderFilter === "admin" && (
        <div className={styles.filters}>
          <button
            className={replyFilter === "all" ? styles.active : ""}
            onClick={() => setReplyFilter("all")}
          >
            כל ההודעות
          </button>
          <button
            className={replyFilter === "active" ? styles.active : ""}
            onClick={() => setReplyFilter("active")}
          >
            משתמשים פעילים
          </button>
          <button
            className={replyFilter === "unactive" ? styles.active : ""}
            onClick={() => setReplyFilter("unactive")}
          >
            משתמשים חסומים או אורחים
          </button>
        </div>
      )}

      <table className={styles.table}>
        <thead>
          <tr>
            <th>מס'</th>
            {senderFilter !== "admin" && <th>שם מלא</th>}
            <th>אימייל</th>
            <th>נושא</th>
            <th>תאריך</th>
            <th>סטטוס</th>
            <th>משתמש קיים?</th>
            {senderFilter === "admin" ? (
              <th>משתמש צפה?</th>
            ) : (
              <th>מנהל ענה?</th>
            )}

            <th>פעולה</th>
          </tr>
        </thead>
        <tbody>
          {messages
            .filter(
              (msg) =>
                (statusFilter === "all" || msg.status === statusFilter) &&
                (senderFilter === "all" || msg.sender_role === senderFilter) &&
                (replyFilter === "all" ||
                  (replyFilter === "active" &&
                    msg.user_id &&
                    msg.user_status === "active") ||
                  (replyFilter === "unactive" &&
                    (!msg.user_id || msg.user_status === "blocked")))
            )

            .map((msg) => (
              <tr key={msg.id}>
                <td>{msg.id}</td>
                {senderFilter !== "admin" && (
                  <td>{`${msg.first_name} ${msg.last_name}`}</td>
                )}
                <td>{msg.email}</td>
                <td>{msg.subject}</td>
                <td>{new Date(msg.created_at).toLocaleString("he-IL")}</td>
                <td>
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
                </td>

                <td>
                  {msg.user_id
                    ? msg.user_status === "blocked"
                      ? "כן, מושהה"
                      : "כן"
                    : "לא"}
                </td>

                <td>
                  {msg.reply_sent && msg.status === "in_progress"
                    ? "בטיפול"
                    : msg.reply_sent
                    ? "✔️"
                    : "❌"}
                </td>

                <td>
                  {msg.sender_role === "admin" ? (
                    <button
                      className={styles.viewBtn}
                      onClick={() => confirmDelete(msg.id)}
                    >
                      מחק
                    </button>
                  ) : (
                    <button
                      className={styles.viewBtn}
                      onClick={() => handleOpen(msg)}
                    >
                      צפייה
                    </button>
                  )}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
      {modalData && (
        <CustomModal
          title={
            modalData.isNew ? "שליחת הודעה חדשה" : `פנייה #${modalData.id}`
          }
          message={
            <div>
              {modalData.isNew ? (
                <>
                  <label>אימייל:</label>
                  <input
                    type="email"
                    list="userEmailList"
                    value={modalData.email || ""}
                    onChange={(e) =>
                      setModalData({ ...modalData, email: e.target.value })
                    }
                  />
                  <datalist id="userEmailList">
                    {userEmails.map((email) => (
                      <option key={email} value={email} />
                    ))}
                  </datalist>

                  <label>נושא:</label>
                  <input
                    type="text"
                    value={modalData.subject || ""}
                    onChange={(e) =>
                      setModalData({ ...modalData, subject: e.target.value })
                    }
                  />

                  <label>הודעה:</label>
                  <textarea
                    rows={4}
                    value={modalData.message || ""}
                    onChange={(e) =>
                      setModalData({ ...modalData, message: e.target.value })
                    }
                  />
                </>
              ) : (
                <>
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
                      setModalData({
                        ...modalData,
                        admin_reply: e.target.value,
                      })
                    }
                  />
                </>
              )}
            </div>
          }
          confirmText="שמור"
          cancelText="סגור"
          onConfirm={handleSave}
          onCancel={() => setModalData(null)}
        />
      )}
      {deleteModal.show && (
        <CustomModal
          title="אישור מחיקה"
          message={<p>האם אתה בטוח שברצונך למחוק את הפנייה הזו?</p>}
          confirmText="מחק"
          cancelText="ביטול"
          onConfirm={() => handleDelete(deleteModal.messageId)}
          onCancel={() => setDeleteModal({ show: false, messageId: null })}
        />
      )}
      {confirmSendModal.show && (
        <CustomModal
          title="שליחת תגובה"
          message={<p>האם ברצונך לשלוח את ההודעה למשתמש?</p>}
          confirmText="שלח"
          cancelText="ביטול"
          onConfirm={confirmSendModal.onConfirm}
          onCancel={() => setConfirmSendModal({ show: false, onConfirm: null })}
        />
      )}
    </div>
  );
}

// function translateStatus(status) {
//   switch (status) {
//     case "new":
//       return "חדש";
//     case "in_progress":
//       return "בטיפול";
//     case "resolved":
//       return "נפתר";
//     default:
//       return status;
//   }
// }

export default AdminMessages;
