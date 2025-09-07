// services/categoryApi.js
// categoryApi.js: שירות קטגוריות — מביא קטגוריות עם תתי-קטגוריות מהשרת (`/api/categories/category-with-subs`) ומחזיר אובייקט נוח לשימוש (קטגוריה → מערך תתי-קטגוריות).

import axios from "axios";

axios.defaults.baseURL = "http://localhost:5000";
axios.defaults.withCredentials = true;

// שליפת קטגוריות ותתי-קטגוריות כמבנה נוח לבר (Object עם מערך תתי קטגוריה לכל קטגוריה)
export async function fetchCategoriesWithSubs() {
  const res = await axios.get("/api/categories/category-with-subs");
  return res.data; // מחזיר { "אלקטרוניקה": ["טלפונים", ...], ... }
}
