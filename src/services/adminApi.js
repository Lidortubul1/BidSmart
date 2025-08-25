import axios from "axios";

const BASE = "http://localhost:5000/api/admin";

// עוזר כללי – בונה params רק אם יש ערכים
function qp(obj) {
  const p = {};
  Object.entries(obj || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") p[k] = v;
  });
  return p;
}

// סטטיסטיקות כלליות (אפשר להוסיף טווח – אופציונלי)
export async function getAdminStats(params) {
  try {
    const res = await axios.get(`${BASE}/stats`, { params: qp(params) });
    return res.data;
  } catch (err) {
    console.error("שגיאה בסטטיסטיקות:", err);
    return null;
  }
}

// הרשמות לפי חודש/שנה – נשאר כמו אצלך
export async function getRegistrationsByMonth(year, month) {
  try {
    const response = await axios.get(`${BASE}/stats/registrations`, {
      params: { year, month },
    });
    return response.data;
  } catch (err) {
    console.error("שגיאה בשליפת הרשמות:", err);
    return [];
  }
}

// מכירות (Revenue) לפי טווח/קיבוץ/מוכר
export async function getRevenue({ from, to, group = "month", seller_id_number }) {
  try {
    const res = await axios.get(`${BASE}/stats/revenue`, {
      params: qp({ from, to, group, seller_id_number }),
    });
    return res.data;
  } catch (err) {
    console.error("שגיאה ב-revenue:", err);
    return [];
  }
}

// פעילות בידים
export async function getBidsActivity({ from, to, group = "day", seller_id_number }) {
  try {
    const res = await axios.get(`${BASE}/stats/bids-activity`, {
      params: qp({ from, to, group, seller_id_number }),
    });
    return res.data;
  } catch (err) {
    console.error("שגיאה ב-bids-activity:", err);
    return [];
  }
}

// מכירות לפי קטגוריה – בטווח/מוכר
export async function getSalesByCategory({ from, to, seller_id_number }) {
  try {
    const res = await axios.get(`${BASE}/stats/sales-by-category`, {
      params: qp({ from, to, seller_id_number }),
    });
    return res.data;
  } catch (err) {
    console.error("שגיאה במכירות לפי קטגוריה:", err);
    return [];
  }
}

// מוכרים מובילים (אפשר גם לסנן לפי מוכר יחיד — יחזיר שורה אחת)
export async function getTopSellers({ from, to, limit = 10, seller_id_number }) {
  try {
    const res = await axios.get(`${BASE}/stats/top-sellers`, {
      params: qp({ from, to, limit, seller_id_number }),
    });
    return res.data;
  } catch (err) {
    console.error("שגיאה במוכרים מובילים:", err);
    return [];
  }
}

// מכירות לפי חודש עם טווח/מוכר
export async function getSalesByMonth({ from, to, seller_id_number }) {
  try {
    const res = await axios.get(`${BASE}/stats/sales-by-month`, {
      params: qp({ from, to, seller_id_number }),
    });
    return res.data;
  } catch (err) {
    console.error("שגיאה בגרף מכירות:", err);
    return [];
  }
}

// משפך מכירות: התחילו / נמכרו / לא נמכרו + המרה
export async function getAuctionFunnel({ from, to, seller_id_number }) {
  try {
    const res = await axios.get(`${BASE}/stats/auction-funnel`, {
      params: qp({ from, to, seller_id_number }),
    });
    return res.data; // { started, sold, not_sold, conversion }
  } catch (err) {
    console.error("שגיאה ב-auction funnel:", err);
    return { started: 0, sold: 0, not_sold: 0, conversion: 0 };
  }
}

// -------- חדש: רשימת מוכרים לקומבובוקס --------
export async function getSellersList() {
  try {
    // יש כבר /users שמחזיר את כולם — נסנן בצד לקוח
    const res = await axios.get(`${BASE}/users`);
    const all = res.data || [];
    return all
      .filter((u) => u.role === "seller" && u.id_number)
      .map((u) => ({
        id_number: u.id_number,
        first_name: u.first_name,
        last_name: u.last_name,
      }));
  } catch (err) {
    console.error("שגיאה בשליפת מוכרים:", err);
    return [];
  }
}


// 👇 חדש: הרשמות לפי טווח וקיבוץ
export async function getRegistrationsRange({ from, to, group = "day" }) {
  try {
    const res = await axios.get(`${BASE}/stats/registrations-range`, {
      params: { from, to, group },
    });
    return res.data; // [{ bucket: "2025-08-01" | "2025-08", count: 12 }, ...]
  } catch (err) {
    console.error("שגיאה בהרשמות בטווח:", err);
    return [];
  }
}


// ... qp ועוד פונקציות קיימות

export async function getProductsStatusTrend({ from, to, group = "month", seller_id_number }) {
  try {
    const res = await axios.get(`${BASE}/stats/products-status-trend`, {
    params: { from, to, group, seller_id_number }
  });
    return Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error("שגיאה ב-products-status-trend:", err);
    return [];
  }
}



// --- Users (buyers/sellers only) ---
export async function getUsers({ role } = {}) {
  try {
    const res = await axios.get(`${BASE}/users`, { params: role ? { role } : {} });
    return res.data;
  } catch (err) {
    console.error("שגיאה בשליפת משתמשים:", err);
    return [];
  }
}

export async function getUserById(id) {
  try {
    const res = await axios.get(`${BASE}/users/${id}`);
    return res.data;
  } catch (err) {
    console.error("שגיאה בשליפת משתמש:", err);
    return null;
  }
}



//פונקציה שמעדכנת את סטטוס המשתמש (active/blocked)
export async function updateUserStatus(id, status) {
  try {
    const res = await axios.put(`${BASE}/users/${id}/status`, { status });
    return res.data; // { message: "סטטוס עודכן בהצלחה" }
  } catch (err) {
    console.error("שגיאה בעדכון סטטוס:", err);
    throw err;
  }
}
