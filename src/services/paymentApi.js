// src/services/paymentApi.js
// paymentApi.js: שירות תשלומים — כולל אישור תשלום (`confirmPayment`) ויצירת הזמנת PayPal (`createOrder`).

import axios from "axios";

// הגדרות בסיס
axios.defaults.baseURL = "http://localhost:5000";
axios.defaults.withCredentials = true;

const BASE_PAYMENT_URL = "/api/payment";

// אישור תשלום עבור מוצר לפי product_id
export async function confirmPayment(product_id) {
  try {
    const response = await axios.post(`${BASE_PAYMENT_URL}/confirm`, {
      product_id,
    });

    return response.data;
  } catch (error) {
    console.error(" שגיאה בקריאת confirmPayment:", error);
    return { success: false, message: "שגיאה בחיבור לשרת" };
  }
}

// יצירת הזמנת תשלום דרך PayPal
export async function createOrder(product_id) {
  const response = await axios.post(`${BASE_PAYMENT_URL}/create-order`, {
    product_id,
  });
  return response.data;
}
