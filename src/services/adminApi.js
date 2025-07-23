import axios from "axios";

export async function getAdminStats() {
  try {
    const res = await axios.get("http://localhost:5000/api/admin/stats");
    return res.data;
  } catch (err) {
    console.error("שגיאה בסטטיסטיקות:", err);
    return null;
  }
}
