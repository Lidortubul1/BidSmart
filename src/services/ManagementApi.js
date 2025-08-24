import axios from "axios";

// הגדרה גלובלית
axios.defaults.baseURL = "http://localhost:5000"; // שנה בפרודקשן
axios.defaults.withCredentials = true;

const BASE_SELLER_URL = "/api/Management";

// טיפ: אם את משתמשת ב-session/cookie, השאירי withCredentials: true
export async function getSellerProducts(filter = "all") {
  const { data } = await axios.get(`${BASE_SELLER_URL}/products`, {
    params: { filter },
    withCredentials: true,
  });
  return data;
}

