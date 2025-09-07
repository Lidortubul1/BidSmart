//src\services\adminMessagesApi.js
// adminMessagesApi: מודול API לניהול פניות והודעות — כולל שליפת פניות, שמירת תשובות, שליחת הודעות יזומות, שליפת מיילים של משתמשים, מחיקת הודעות ובדיקת סטטוס משתמש.

import axios from "axios";

axios.defaults.baseURL = "http://localhost:5000";

// מביא את כל הפניות
export const fetchAllMessages = async () => {
  try {
    const res = await axios.get("/api/admin/messages");
    return res.data;
  } catch (err) {
    console.error("שגיאה בקבלת הפניות:", err);
    return [];
  }
};

// שמירת תשובה לפנייה
export const saveMessageReply = async (messageId, updatedMessage) => {
  try {
    const res = await axios.put(
      `/api/admin/messages/${messageId}`,
      updatedMessage
    );
    console.log("שאלה נשמרה בהצלחה:", res.data);
    return res.data;
  } catch (err) {
    console.error("שגיאה בשמירת תשובה:", err);
    throw err;
  }
};



// שליחת הודעה יזומה למשתמש
export const sendNewMessageToUser = async (newMessage) => {
  try {
    const res = await axios.post("/api/admin/messages", newMessage);
    return res.data;
  } catch (err) {
    console.error("שגיאה בשליחת הודעה חדשה:", err);
    throw err;
  }
};


//כל המיילים של המשתמשים בשביל השדה של מייל של המנהל
export async function fetchUserEmails() {
  const res = await axios.get("/api/admin/messages/user-emails");
  return res.data;
}

// מחיקת הודעה לפי ID
export const deleteMessageById = async (id) => {
  try {
    const res = await axios.delete(`/api/admin/messages/${id}`);
    return res.data;
  } catch (err) {
    console.error("שגיאה במחיקת הודעה:", err);
    throw err;
  }
};

//סטטוס אם היוזר פעיל או מושהה או לא קיים בשביל העמודה של משתמש קיים בפניות משתמשים\מנהל