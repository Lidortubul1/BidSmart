// src/services/quotationApi.js
import axios from "axios";

// הגדרה גלובלית
axios.defaults.baseURL = "http://localhost:5000"; // שנה בפרודקשן
axios.defaults.withCredentials = true;

const BASE_QUOTATION_URL = "/api/quotation";

// בדיקת הרשמה למוצר
export async function getQuotationsByProductId(productId) {
  const response = await axios.get(`${BASE_QUOTATION_URL}/${productId}`);
  return response.data;
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
      "❌ שגיאה בהרשמה למוצר:",
      error.response?.data || error.message
    );
    throw error;
  }
}

// הסרת הצעה
export async function cancelQuotationRegistration(productId, buyerIdNumber) {
  await axios.delete(`${BASE_QUOTATION_URL}/${productId}/${buyerIdNumber}`);
}

// הצגת כל ההצעות של המשתמש שנרשם אליהן
export async function getUserBids(idNumber) {
  const response = await axios.get(`${BASE_QUOTATION_URL}/user/${idNumber}`);
  return response.data;
}
