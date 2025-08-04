import axios from "axios";

// הגדרה גלובלית (אם לא כבר הוגדרה במקום אחר בפרויקט)
axios.defaults.baseURL = "http://localhost:5000";
axios.defaults.withCredentials = true;

const BASE_SALE_URL = "/api/sale";

//שולח כתובת לטבלת sale לפי מזהה מוצר ושיטת משלוח (משלוח או איסוף עצמי)
export async function updateSaleAddress(
  productId,
  deliveryMethod,
  addressData
) {
  const response = await axios.post(`${BASE_SALE_URL}/update-sale-address`, {
    product_id: productId,
    delivery_method: deliveryMethod,
    ...addressData,
  });
  return response.data;
}

// מעדכן את כתובת המגורים של המשתמש בטבלת users לפי כתובת שנבחרה במשלוח
export async function updateUserAddress(productId, addressData) {
  const response = await axios.post(`${BASE_SALE_URL}/update-user-address`, {
    product_id: productId,
    ...addressData,
  });
  return response.data;
}

//מחזיר את כתובת המגורים של המשתמש מתוך טבלת users כדי לשכפל אותה לטופס המשלוח
export async function getUserSavedAddress(productId) {
  const response = await axios.post(`${BASE_SALE_URL}/get-user-address`, {
    product_id: productId,
  });
  console.log(response.data);
  return response.data;
}

// מחזיר את כל ההזמנות
export async function getAllSales() {
  const response = await axios.get(`${BASE_SALE_URL}/all`);
  return response.data;
}

// סימון מוצר כהתקבל
export async function markProductDelivered(product_id) {
  const response = await axios.put(`${BASE_SALE_URL}/mark-delivered`, {
    product_id,
  });
  return response.data;
}

//סימון ע"י המוכר שהפריט נשלח לקונה או נמסר באיסוף עצמי
export async function markProductAsSent(productId) {
  try {
    await axios.put(`/api/sale/mark-as-sent/${productId}`);
  } catch (error) {
    console.error("❌ שגיאה בעדכון המוצר כנשלח:", error);
  }
}
