import axios from "axios";

const BASE_URL = "http://localhost:5000/api/quotation";



//בדיקת הרשמה למוצר
export async function getQuotationsByProductId(productId) {
  const response = await axios.get(`${BASE_URL}/${productId}`);
  return response.data;
}


//הרשמה להצעה למוצר
export async function registerToQuotation(productId, buyerIdNumber) {
  try {
    const response = await axios.post(BASE_URL, {
      product_id: productId,
      buyer_id_number: String(buyerIdNumber),
      price: 0,
    });
    return response.data;
  } catch (error) {
    console.error("שגיאה ב־registerToQuotation:", error.response?.data || error.message);
    throw error;
  }
}

//הסרת הצעה
export async function cancelQuotationRegistration(productId, buyerIdNumber) {
  await axios.delete(`${BASE_URL}/${productId}/${buyerIdNumber}`);
}

//עדכון פרטי המשתמש עם תעודת הזהות
export async function uploadIdCard({ idNumber, idPhotoFile, email }) {
  const formData = new FormData();
  formData.append("id_number", idNumber);
  formData.append("id_card_photo", idPhotoFile);
  formData.append("email", email);

  const response = await axios.put(
    "http://localhost:5000/api/auth/registerToQuotaion",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
      withCredentials: true,
    }
  );
  return response.data;
}