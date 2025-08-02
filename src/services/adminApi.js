import axios from "axios";


//סטטיסטיקות כלליות 
export async function getAdminStats() {
  try {
    const res = await axios.get("http://localhost:5000/api/admin/stats");
    return res.data;
  } catch (err) {
    console.error("שגיאה בסטטיסטיקות:", err);
    return null;
  }
}


// שליפה כמות נרשמים לפי חודש ושנה 
export async function getRegistrationsByMonth(year, month) {
  console.log(`Fetching registrations for year ${year} and month ${month}`);
  try {
    const response = await axios.get(`/api/admin/stats/registrations`, {
      params: { year, month },
    });
    return response.data;
  } catch (err) {
    console.error("שגיאה בשליפת הרשמות:", err);
    return [];
  }
}

//שליפת כמות מוצרים לפי קטגוריה 
export async function getProductsByCategory() {
  try {
    const res = await axios.get("/api/admin/stats/products-by-category");
    return res.data;
  } catch (err) {
    console.error("שגיאה בשליפת מוצרים לפי קטגוריה:", err);
    return [];
  }
}

//סכום מכירות לפי חודש
export async function getSalesByMonth() {
  try {
    const res = await axios.get("/api/admin/stats/sales-by-month");
    return res.data;
  } catch (err) {
    console.error("שגיאה בגרף מכירות:", err);
    return [];
  }
}

