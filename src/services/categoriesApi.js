// services/categoryApi.js
import axios from "axios";

axios.defaults.baseURL = "http://localhost:5000";
axios.defaults.withCredentials = true;

// שליפת קטגוריות ותתי-קטגוריות כמבנה נוח לבר (Object עם מערך תתי קטגוריה לכל קטגוריה)
export async function fetchCategoriesWithSubs() {
  const res = await axios.get("/api/categories/category-with-subs");
  return res.data; // מחזיר { "אלקטרוניקה": ["טלפונים", ...], ... }
}
