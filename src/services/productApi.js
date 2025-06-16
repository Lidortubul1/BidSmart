// src/services/productApi.js
import axios from "axios";

// הגדרות כלליות 
axios.defaults.baseURL = "http://localhost:5000";
axios.defaults.withCredentials = true;


//הוספת מוצר 
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

  const response = await axios.post("/api/product", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response.data;
}

//פונקציה שמראה את כל המוצרים למכירה
export async function fetchAllProducts() {
  const response = await axios.get("/api/product");
  return response.data;
}


//הצגת מוצר לפי קוד מוצר
export async function getProductById(id) {
  const res = await axios.get(`http://localhost:5000/api/product/${id}`);
  return res.data;
}

//קבלת כל המוצרים של המשתמש
export async function getAllProducts() {
  return await axios.get("http://localhost:5000/api/product");
}

