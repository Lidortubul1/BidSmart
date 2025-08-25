// src/services/contactApi.js
import axios from "axios";
axios.defaults.baseURL = "http://localhost:5000";
axios.defaults.withCredentials = true;

/* ==========================================================
   (למנהל): הבאת רשימת טיקטים עם פילטרים
   params אופציונליים: { type: 'general'|'report', status:'unread'|'progress'|'read', q: 'טקסט לחיפוש' }
   ========================================================== */

export async function fetchTickets(params = {}) {
  const res = await axios.get("/api/contacts", { params });
  return res.data;
}

// src/services/contactApi.js
// ⬅️ שינוי קטן: הוספת params ל-axios.get
export async function fetchTicketMessages(ticketId, params = {}) {
  const res = await axios.get(`/api/contacts/${ticketId}/messages`, { params });
  return res.data;
}

/* ==========================================================
    (למנהל): עדכון סטטוס טיקט
   ערכים מותרים: 'unread' | 'progress' | 'read'
   ========================================================== */
export async function updateTicketStatus(ticketId, status, opts = {}) {
  const params = {};
  if (opts.cascade) params.cascade = 1; // חשוב: "1" ולא true

  const res = await axios.put(
    `/api/contacts/${ticketId}/status`,
    { status },                 // הגוף
    { params }                  // הפרמטרים לשאילתא (?cascade=1)
  );
  return res.data;
}


// דיווחים של מוצר מסוים (לבחירה בדרופדאון)
export async function fetchProductReportTickets(productId) {
  const res = await axios.get(`/api/contacts/by-product/${productId}`);
  return res.data;
}

// הודעה למוכר (מנהל)
export async function adminSendMessageToSeller(productId, body, relatedTicketId = null) {
  const res = await axios.post(`/api/contacts/product/${productId}/message-to-seller`, {
    body,
    related_ticket_id: relatedTicketId,
  });
  return res.data;
}

/* ==========================================================
   קיים: יצירת טיקט כללי + הודעת משתמש ראשונה
   שימוש: צד לקוח לא מחובר לנושא מוצר ספציפי
   ========================================================== */
export async function createGeneralTicket({ subject, email, first_name, last_name, body }) {
  // 1) יצירת הטיקט עצמו (type=general)
  const { data: t } = await axios.post("/api/contacts", {
    type_message: "general",
    product_id: "",
    subject,
    email,
    first_name,
    last_name,
  });

  // 2) הוספת הודעת המשתמש הראשונה לטיקט
  await axios.post(`/api/contacts/${t.ticket_id}/message`, {
    sender_role: "user",
    body,
  });

  return t; // { success, ticket_id }
}

/* ==========================================================
   קיים: דיווח על מוצר (דורש משתמש מחובר; השרת שואב שם+מייל מה-session)
   ========================================================== */
export async function createReportTicket({ product_id, subject, body }) {
  const { data } = await axios.post("/api/contacts/report", {
    product_id,
    subject,
    body,
  });
  return data; // { success, ticket_id, message_id }
}


   



/* ==========================================================
    (למנהל): שליחת מענה מנהל לטיקט
   השרת ישלח מייל למשתמש אם הוגדר SMTP (.env)
   ========================================================== */
export async function sendAdminMessage(ticketId, body) {
  const { data } = await axios.post(`/api/contacts/${ticketId}/message`, {
    sender_role: "system", // חשוב: מגדיר שזו תשובת מערכת/מנהל
    body,
  });
  // צפוי להחזיר { success:true, message_id, mail:{ sent: boolean, ... } }
  return data;
}



// admin – הערת מנהל לפי מוצר (על האב)
export async function adminAddInternalNoteByProduct(productId, body) {
  const { data } = await axios.post(`/api/contacts/product/${productId}/internal-note`, { body }, { withCredentials: true });
  return data;
}

// admin – הערת מנהל לפי טיקט (כללי/ילד)
export async function adminAddInternalNoteByTicket(ticketId, body) {
  const { data } = await axios.post(`/api/contacts/${ticketId}/internal-note`, { body }, { withCredentials: true });
  return data;
}
