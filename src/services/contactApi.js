import axios from "axios";

axios.defaults.baseURL = "http://localhost:5000";
axios.defaults.withCredentials = true;

//יצירת הודעה כללית של קונה להנהלה
export async function createGeneralTicket({ subject, email, first_name, last_name, body }) {
  const { data: t } = await axios.post("/api/contacts", {
    type_message: "general",
    product_id: "",
    subject,
    email,
    first_name,
    last_name,
  });
  await axios.post(`/api/contacts/${t.ticket_id}/message`, {
    sender_role: "user",
    body,
  });
  return t;
}



/** דיווח על מוצר (מחייב משתמש מחובר; השרת יקח שם+מייל מ-req.user) */
export async function createReportTicket({ product_id, subject, body }) {
  const { data } = await axios.post("/api/contacts/report", {
    product_id,
    subject,
    body,
  });
  return data; // { success, ticket_id, message_id }
}