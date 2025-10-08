//src\services\adminApi.js
// adminApi: מודול קריאות ניהול לשרת — סטטיסטיקות לדשבורד (רווחים, הרשמות, מכירות לפי קטגוריה/חודש, משפך, טרנדים, מוכרים מובילים), וריכוז ניהול משתמשים (רשימה, פרטי משתמש, עדכון סטטוס) ומוצרים של מוכר לפי ת"ז.

import axios from "axios";

const BASE = "http://localhost:5000/api/admin";

/** עוזר: בונה אובייקט params רק עם מפתחות שיש להם ערך */
function qp(obj) {
  const p = {};
  Object.entries(obj || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") p[k] = v;
  });
  return p;
}

//פונקציות של סטטיסטיקה למנהל 

/** מביא סטטיסטיקות כלליות לדשבורד (אופציונלית לפי טווח תאריכים) */
export async function getAdminStats(params) {
  try {
    const res = await axios.get(`${BASE}/stats`, { params: qp(params) });
    return res.data;
  } catch (err) {
    console.error("שגיאה בסטטיסטיקות:", err);
    return null;
  }
}

/** מביא מספר הרשמות לפי ימים עבור חודש/שנה מסוימים */
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

/** מביא הכנסות (Revenue) לפי טווח וקיבוץ (יום/חודש) ואופציונלית לפי מוכר */
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

/** מביא מכירות לפי קטגוריה בטווח תאריכים ואופציונלית עבור מוכר מסוים */
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

/** מביא רשימת מוכרים מובילים (סכום מכירות/כמות) לפי טווח, עם limit */
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

/** מביא סכומי מכירות לפי חודש עבור טווח תאריכים ואופציונלית לפי מוכר */
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

/** מביא משפך מכירות (התחילו/נמכרו/לא נמכרו/המרה) בטווח תאריכים */
export async function getAuctionFunnel({ from, to, seller_id_number }) {
  try {
    const res = await axios.get(`${BASE}/stats/auction-funnel`, {
      params: qp({ from, to, seller_id_number }),
    });
    return res.data; // { started, sold, not_sold, conversion }
  } catch (err) {
    console.error("שגיאה ב-auction funnel:", err);
    return { started: 0, sold: 0, not_sold: 0,not_started: 0, conversion: 0 };
  }
}

/** מחזיר רשימת מוכרים (ת״ז + שם) לצורך קומבובוקס סינון */
export async function getSellersList() {
  try {
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

/** מביא מספר הרשמות בטווח תאריכים, מקובצות לפי יום/חודש */
export async function getRegistrationsRange({ from, to, group = "day" }) {
  try {
    const res = await axios.get(`${BASE}/stats/registrations-range`, {
      params: { from, to, group },
    });
    return res.data; // [{ bucket: "YYYY-MM-DD" | "YYYY-MM", count: N }]
  } catch (err) {
    console.error("שגיאה בהרשמות בטווח:", err);
    return [];
  }
}

/** מביא טרנד סטטוסים של מוצרים (for sale/sale/not sold/blocked) בטווח */
export async function getProductsStatusTrend({ from, to, group = "month", seller_id_number }) {
  try {
    const res = await axios.get(`${BASE}/stats/products-status-trend`, {
      params: { from, to, group, seller_id_number },
    });
    return Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error("שגיאה ב-products-status-trend:", err);
    return [];
  }
}

//פונקציות של ניהול משתמשים למנהל

//דף AdminUsersList.jsx
/** מביא רשימת משתמשים (buyer/seller) עם סינון אופציונלי לפי role */
export async function getUsers({ role } = {}) {
  try {
    const res = await axios.get(`${BASE}/users`, { params: role ? { role } : {} });
    return res.data;
  } catch (err) {
    console.error("שגיאה בשליפת משתמשים:", err);
    return [];
  }
}

/** מביא פרטי משתמש בודד לפי מזהה פנימי (id) */
export async function getUserById(id) {
  try {
    const res = await axios.get(`${BASE}/users/${id}`);
    return res.data;
  } catch (err) {
    console.error("שגיאה בשליפת משתמש:", err);
    return null;
  }
}

/** מעדכן סטטוס משתמש (active/blocked) עבור id ספציפי */
export async function updateUserStatus(id, status) {
  try {
    const res = await axios.put(`${BASE}/users/${id}/status`, { status });
    return res.data; // { message: "סטטוס עודכן בהצלחה" }
  } catch (err) {
    console.error("שגיאה בעדכון סטטוס:", err);
    throw err;
  }
}

/** מביא את כל המוצרים של מוכר לפי תעודת זהות (id_number) – לשימוש אדמין */
export async function getProductsBySellerIdNumber(seller_id_number) {
  try {
    const res = await axios.get(`${BASE}/seller/${seller_id_number}/products`);
    return res.data;
  } catch (err) {
    console.error("שגיאה בשליפת מוצרים לפי מוכר:", err);
    return [];
  }
}
