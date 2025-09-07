//src\services\userApi.js
// userApi.js: שירות משתמשים — פונקציה ייעודית לאדמין לשליפת פרטי משתמש לפי מספר ת״ז (id\_number), כולל טלפון, תפקיד, סטטוס, כתובת, תמונות ותאריך הרשמה.

import axios from "axios";

axios.defaults.baseURL = "http://localhost:5000";
axios.defaults.withCredentials = true;


// --- Admin only: fetch user by ID number ---
export async function adminFetchUserByIdNumber(idNumber) {
  const { data } = await axios.get(`/api/users/user/${encodeURIComponent(idNumber)}`);
  if (data?.success === false) throw new Error(data.message || "Failed to fetch user");
  return data.user; // כולל עכשיו: id, phone, role, status, address fields, photos, registered...
}