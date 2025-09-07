//src\services\adminCategoryApi.js
// adminCategoryApi: מודול API לניהול קטגוריות ותתי־קטגוריות — כולל שליפה, הוספה ומחיקה של קטגוריות ותתי־קטגוריות עבור ממשק אדמין.

import axios from "axios";

axios.defaults.baseURL = "http://localhost:5000";

// שליפת כל הקטגוריות
export async function fetchCategories() {
  const res = await axios.get("/api/admin/category");
  return res.data;
}

// שליפת תתי-קטגוריות לקטגוריה מסוימת
export async function fetchSubcategories(categoryId) {
  const res = await axios.get(`/api/admin/category/${categoryId}/subcategories`);
  return res.data;
}

// הוספת קטגוריה
export async function addCategory(name) {
  const res = await axios.post("/api/admin/category", { name });
  return res.data;
}

// הוספת תת-קטגוריה
export async function addSubcategory(name, category_id) {
  const res = await axios.post("/api/admin/category/subcategory", {
    name,
    category_id,
  });
  return res.data;
}

// מחיקת קטגוריה
export async function deleteCategory(id) {
  return axios.delete(`/api/admin/category/${id}`);
}

// מחיקת תת-קטגוריה
export async function deleteSubcategory(id) {
  return axios.delete(`/api/admin/category/subcategory/${id}`);
}
