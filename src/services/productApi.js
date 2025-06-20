// src/services/productApi.js
import axios from "axios";

// הגדרות כלליות
axios.defaults.baseURL = "http://localhost:5000"; // שנה בפרודקשן
axios.defaults.withCredentials = true;

// הוספת מוצר
export async function addProduct(productData) {
  const formData = new FormData();

  for (const key in productData) {
    if (key === "images" && productData.images instanceof FileList) {
      Array.from(productData.images).forEach((file) => {
        formData.append("images", file);
      });
    } else if (productData[key]) {
      formData.append(key, productData[key]);
    }
  }

  try {
    const response = await axios.post("/api/product", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return response.data;
  } catch (error) {
    console.error("❌ שגיאה בשרת:", error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || "שגיאת שרת",
    };
  }
}

// שליפת כל המוצרים
export async function fetchAllProducts() {
  const response = await axios.get("/api/product");
  return response.data;
}

// שליפת כל המוצרים של המשתמש (הוספתי await במקום return raw)
export async function getAllProducts() {
  const response = await axios.get("/api/product");
  return response.data;
}

// שליפת מוצר לפי מזהה
export async function getProductById(productId) {
  const response = await axios.get(`/api/product/${productId}`);
  return response.data;
}
