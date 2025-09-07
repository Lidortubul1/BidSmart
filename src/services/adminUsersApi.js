// services/adminUsersApi.js
// adminUsersApi: מודול API לניהול משתמשים ע"י מנהל — כולל עדכון סטטוס משתמש (חסום/פעיל) ומחיקת משתמש לפי מזהה.

import axios from "axios";

axios.defaults.baseURL = "http://localhost:5000";
axios.defaults.withCredentials = true;

//פונקציה שמעדכנת את המשתמש לחסום
export async function updateUserStatus(id, status) {
  return await axios.put(`/api/admin/users/${id}/status`, { status });
}

//פונקציה למחיקת יוזר ע"י המנהל
// services/adminUsersApi.js
export async function deleteUser(id) {
  const res = await axios.delete(`/api/admin/users/${id}`);
  return res.data;
}



