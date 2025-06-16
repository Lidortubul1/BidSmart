import axios from "axios";

const BASE_URL = "http://localhost:5000/api/sale";


//שולח כתובת לטבלת sale לפי מזהה מוצר ושיטת משלוח (משלוח או איסוף עצמי)
export async function updateSaleAddress(
  productId,
  deliveryMethod,
  addressData
) {
  const response = await axios.post(`${BASE_URL}/update-sale-address`, {
    product_id: productId,
    delivery_method: deliveryMethod,
    ...addressData,
  });
  return response.data;
}


 // מעדכן את כתובת המגורים של המשתמש בטבלת users לפי כתובת שנבחרה במשלוח
export async function updateUserAddress(productId, addressData) {
  const response = await axios.post(`${BASE_URL}/update-user-address`, {
    product_id: productId,
    ...addressData,
  });
  return response.data;
}


//מחזיר את כתובת המגורים של המשתמש מתוך טבלת users כדי לשכפל אותה לטופס המשלוח
export async function getUserSavedAddress(productId) {
  const response = await axios.post(`${BASE_URL}/get-user-address`, {
    product_id: productId,
  });
  return response.data;
}

// מחזיר את כל ההזמנות
export async function getAllSales() {
  return await axios.get("http://localhost:5000/api/sale/all");
}

// סימון מוצר כהתקבל
export async function markProductDelivered(product_id) {
  return await axios.put("http://localhost:5000/api/sale/mark-delivered", {
    product_id,
  });
}
