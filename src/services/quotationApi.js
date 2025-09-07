// src/services/quotationApi.js
// quotationApi.js: שירות הצעות/הרשמות — שליפת כמות נרשמים, כל ההצעות לפי מוצר/משתמש, בדיקת סטטוס תשלום (כללי/זוכה), הרשמה למכירה, ביטול הרשמה.

import axios from "axios";

// הגדרה גלובלית
axios.defaults.baseURL = "http://localhost:5000"; // שנה בפרודקשן
axios.defaults.withCredentials = true;

const BASE_QUOTATION_URL = "/api/quotation";

//כמה נרשמו לכל מוצר 
export async function getRegistrationsCount(productId) {
  const { data } = await axios.get(`${BASE_QUOTATION_URL}/count`, {
    params: { product_id: productId },
    withCredentials: true,
  });
  console.log("data",{data},"id", productId)
  // מחזיר רק את המספר לשימוש נוח בקומפוננטה
  return Number(data?.count || 0);
}



// בדיקת הרשמה למוצר
export async function getQuotationsByProductId(productId) {
  const response = await axios.get(`${BASE_QUOTATION_URL}/${productId}`);
  return response.data;
}

//  סטטוס תשלום לבידר ספציפי (מחזיר {success, found, paid})
export async function getPaidStatus(productId, buyerIdNumber) {
  const res = await axios.get(
    `${BASE_QUOTATION_URL}/${productId}/paid/${buyerIdNumber}`
  );
  return res.data;
}

//  סטטוס תשלום לזוכה של המוצר (מחזיר {success, found, paid, buyer_id_number})
export async function getWinnerPaidStatus(productId) {
  const res = await axios.get(`${BASE_QUOTATION_URL}/${productId}/paid`);
  return res.data;
}

// הרשמה להצעה למוצר
export async function registerToQuotation(productId, buyerIdNumber) {
  try {
    const response = await axios.post(BASE_QUOTATION_URL, {
      product_id: productId,
      buyer_id_number: String(buyerIdNumber),
      price: 0,
    });
    return response.data;
  } catch (error) {
    console.error(
      " שגיאה בהרשמה למוצר:",
      error.response?.data || error.message
    );
    throw error;
  }
}

// הסרת קונה ממכירה
export async function cancelQuotationRegistration(productId, buyerIdNumber) {
  await axios.delete(`${BASE_QUOTATION_URL}/${productId}/${buyerIdNumber}`);
}

// הצגת כל ההצעות של המשתמש שנרשמו אליהן
export async function getUserBids(idNumber) {
  const response = await axios.get(`${BASE_QUOTATION_URL}/user/${idNumber}`);
  return response.data;
}
