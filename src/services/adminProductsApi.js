//src\services\adminProductsApi.js
// adminProductsApi: מודול API לניהול מוצרים ע"י מנהל — כולל שליפת כל המוצרים, שליפת מוצר בודד, עדכון ומחיקת מוצר, ניהול תמונות (הוספה ומחיקה).

import axios from "axios";

axios.defaults.baseURL = "http://localhost:5000"; // שנה בפרודקשן
axios.defaults.withCredentials = true;

//יבוא כל המוצרים באתר ע"י המנהל
export async function fetchAllProducts() {
  const res = await axios.get("/api/admin/products");
  return res.data;
}

// שליפת מוצר לפי מזהה
export async function getProductById(productId) {
  const response = await axios.get(`/api/product/${productId}`);
  return response.data;
}

//פונקציה לעדכון מוצר ע"י מנהל
export async function updateProduct(productId, updateData) {
  return axios.put(`/api/admin/product/${productId}`, updateData);
}

//פונקצייה למחיקת מוצר ע"י המנהל
export async function deleteProduct(productId) {
  return axios.delete(`/api/admin/product/${productId}`);
}

//פונקציה למחיקת תמונה של מוצר
export async function deleteProductImage(productId, imageUrl) {
  return axios.delete(`/api/admin/product/${productId}/image`, {
    data: { image_url: imageUrl },
  });
}

//פונקציה להוספת תמונה למוצר 
export async function addProductImage(productId, file) {
  const formData = new FormData();
  formData.append("image", file);
  await axios.post(`/api/admin/product/${productId}/image`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}
