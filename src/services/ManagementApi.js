//src\services\ManagementApi.js
// ManagementApi.js: שירות ניהול מוצרים למוכר/מנהל — כולל שליפת רשימת מוצרים עם אפשרות סינון (ברירת מחדל "all").

import axios from "axios";

// הגדרה גלובלית
axios.defaults.baseURL = "http://localhost:5000"; // שנה בפרודקשן
axios.defaults.withCredentials = true;

const BASE_SELLER_URL = "/api/Management";

// לקיחת כל המוצרים אם מנהל או מוכר 
export async function getSellerProducts(filter = "all") {
  const { data } = await axios.get(`${BASE_SELLER_URL}/products`, {
    params: { filter },
    withCredentials: true,
  });
  return data;
}

