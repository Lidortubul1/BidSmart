// src/services/productApi.js
import axios from "axios";
import { FaStar, FaStarHalfAlt, FaRegStar } from "react-icons/fa";

// הגדרות כלליות
axios.defaults.baseURL = "http://localhost:5000"; // שנה בפרודקשן
axios.defaults.withCredentials = true;




// עדכון מוצר (למוכר+מנהל)
export async function peUpdateProduct(id, payload) {
  const { data } = await axios.put(
    `/api/product/product/${id}`,
    payload,
    { withCredentials: true }
  );
  return data;
}


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


//שליפת בחירת אופציית משלוח של מוכר אם משלוח או גם משלוח וגם איסוף עצמי
export async function getSellerDeliveryOptions(productId) {
  const { data } = await axios.get(`/api/product/seller-delivery-options/${productId}`);

  const raw = (data?.option || "delivery").toString().trim().toLowerCase();
  const option =
    raw === "delivery+pickup" || raw === "delivery_pickup"
      ? "delivery+pickup"
      : "delivery";

  const pickupAddress = data?.pickupAddress || null;
  const pickupAddressText = formatPickupAddress(pickupAddress);

  return { 
    option, 
    pickupAddress, 
    pickupAddressText, 
    rating: data?.rating ?? 0 
  };
}


/** מעצב אובייקט כתובת לטקסט תצוגה נעים */
function formatPickupAddress(addr) {
  if (!addr) return "";
  const parts = [
    addr.street && addr.house_number ? `${addr.street} ${addr.house_number}` : (addr.street || ""),
    addr.apartment_number ? `דירה ${addr.apartment_number}` : "",
    addr.city || "",
    addr.zip ? `מיקוד ${addr.zip}` : "",
    addr.country || "",
  ].filter(Boolean);

  // אם הכל ריק, נחזיר מחרוזת ריקה
  if (parts.length === 0) return "";
  return parts.join(", ");
}

//פונקציה ליצירת כוכבים
export function renderStars(rating) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    if (rating >= i) {
      stars.push(<FaStar key={i} color="#FFD700" size={20} />);
    } else if (rating >= i - 0.5) {
      stars.push(<FaStarHalfAlt key={i} color="#FFD700" size={20} />);
    } else {
      stars.push(<FaRegStar key={i} color="#ccc" size={20} />);
    }
  }
  return stars;
}



//-מעבר סטטוס מוצר לblocked ------- ביטול מכירה
export async function cancelProductSale(productId) {
  const { data } = await axios.post(`/api/product/product/${productId}/cancel`);
  return data;
}

// מחיקת תמונה
export async function removeProductImage(productId, imageUrl) {
  return axios.delete(`/api/product/product/${productId}/images`, {
    data: { image_url: imageUrl },
  });
}

// הוספת תמונה
export async function uploadProductImage(productId, file) {
  const formData = new FormData();
  formData.append("image", file); // חייב להתאים ל-upload.single("image")
  await axios.post(`/api/product/product/${productId}/images`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

export async function expireUnpaidProduct(productId) {
  const { data } = await axios.post("/api/product/expire-unpaid", {
    product_id: productId,
  });
  return data;
}



// פרסום מחדש (Relist) – יצירת מוצר חדש עם אותם פרטים ותמונות
export async function peRelistProduct(originalProductId, payload = {}) {
  const body = { copy_images: true, ...payload };
  const { data } = await axios.post(
    `/api/product/product/${originalProductId}/relist`,
    body,
    { withCredentials: true }
  );
  return data;
}


