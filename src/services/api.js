//src\services\api.js
// api.js: שירות כללי לניהול משתמשים — שליפה, עדכון סטטוס ותפקיד, ומחיקה דרך קריאות ל־API.

import axios from "axios";

axios.defaults.baseURL = "http://localhost:5000";
axios.defaults.withCredentials = true;

//  ניהול משתמשים ע"י מנהל
export async function getAllUsers() {
  const response = await axios.get("http://localhost:5000/api/users");
  return response.data;
}

export async function updateUserStatus(id, status) {
  await axios.put(`http://localhost:5000/api/users/${id}/status`, { status });
}

export async function updateUserRole(id, role) {
  await axios.put(`http://localhost:5000/api/users/${id}/role`, { role });
}

export async function deleteUser(id) {
  await axios.delete(`http://localhost:5000/api/users/${id}`);
}
