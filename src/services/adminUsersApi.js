// services/adminUsersApi.js
import axios from "axios";

axios.defaults.baseURL = "http://localhost:5000";
axios.defaults.withCredentials = true;

//פונקציה שמייבאת את נתונים המשתמשים בדף ניהול משתמש
export async function fetchAllUsers() {
  const res = await axios.get("/api/admin/users");
  return res.data;
}


//פונקציה שמעדכנת את המשתמש לחסום
export async function updateUserStatus(id, status) {
  return await axios.put(`/api/admin/users/${id}/status`, { status });
}


// עדכון משתמש (id הוא מזהה ייחודי)
// services/adminUsersApi.js
export async function updateUserDetails(id, userData) {
  const res = await axios.put(`/api/admin/users/${id}`, userData);
  return res.data;
}

//פונקציה למחיקת יוזר ע"י המנהל
// services/adminUsersApi.js
export async function deleteUser(id) {
  const res = await axios.delete(`/api/admin/users/${id}`);
  return res.data;
}



