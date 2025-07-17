import axios from "axios";

// הגדרה גלובלית
axios.defaults.baseURL = "http://localhost:5000"; // שנה בפרודקשן
axios.defaults.withCredentials = true;

const BASE_SELLER_URL = "/api/seller";

// שליפת המוצרים של המוכר עם סינון (all, sold, pending, unsold)
export async function getSellerProducts(filter = "all") {
  try {
    const response = await axios.get(
      `${BASE_SELLER_URL}/products?filter=${filter}`
    );
    return response.data;
  } catch (error) {
    console.error(
      "❌ שגיאה בשליפת המוצרים לניהול:",
      error.response?.data || error.message
    );
    throw error;
  }
}
