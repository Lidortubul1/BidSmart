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
export async function updateUserStatus(email, status) {
  return await axios.put(`/api/admin/users/${email}/status`, { status });
}


// עדכון משתמש (email הוא מזהה ייחודי)
// services/adminUsersApi.js
export async function updateUserDetails(email, userData) {
  const res = await axios.put(`/api/admin/users/${email}`, userData);
  return res.data;
}


//פונקציה למחיקת יוזר ע"י המנהל
// services/adminUsersApi.js
export async function deleteUser(email) {
  return fetch(`/api/admin/user/${encodeURIComponent(email)}`, {
    method: "DELETE",
  }).then((res) => {
    if (!res.ok) throw new Error("מחיקה נכשלה");
    return res.json();
  });
}




