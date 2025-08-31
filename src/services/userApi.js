import axios from "axios";

axios.defaults.baseURL = "http://localhost:5000";
axios.defaults.withCredentials = true;


// --- Admin only: fetch user by ID number ---
export async function adminFetchUserByIdNumber(idNumber) {
  const { data } = await axios.get(`/api/users/user/${encodeURIComponent(idNumber)}`);
  if (data?.success === false) throw new Error(data.message || "Failed to fetch user");
  return data.user; // כולל עכשיו: id, phone, role, status, address fields, photos, registered...
}