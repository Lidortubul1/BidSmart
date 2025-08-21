import axios from "axios";

// הגדרת ברירת מחדל לבסיס ה־URL
axios.defaults.baseURL = "http://localhost:5000"; // שנה זאת לפרודקשן בעתיד
axios.defaults.withCredentials = true;

// בסיס עבור כל פעולות ההרשאה
const BASE_URL = "/api/auth";

// פונקציית התחברות
export async function loginUser(email, password) {
  try {
    const response = await axios.post(`${BASE_URL}/login`, { email, password });
    return response.data;
  } catch (error) {
    console.error("Error logging in:", error);
    throw error;
  }
}

// פונקציית הרשמה
export async function registerUser(firstName, lastName, email, password) {
  try {
    const response = await axios.post(`${BASE_URL}/register`, {
      first_name: firstName,
      last_name: lastName,
      email,
      password,
    });
    return response.data;
  } catch (error) {
    console.error("Error registering:", error);
    throw error;
  }
}

// עדכון תעודת זהות + צילום תעודה
export async function uploadIdCard({ idNumber, idPhotoFile, email }) {
  const formData = new FormData();
  formData.append("id_number", idNumber);
  formData.append("id_card_photo", idPhotoFile);
  formData.append("email", email);

  const response = await axios.put(`${BASE_URL}/save-id-info`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

// איפוס סיסמה עם טוקן
export async function resetPassword(token, newPassword) {
  const response = await axios.post(`${BASE_URL}/reset-password`, {
    token,
    newPassword,
  });
  return response.data;
}

// עדכון פרופיל (כולל קבצים)
export async function updateUserProfile(formData) {
  const response = await axios.put(`${BASE_URL}/update-profile`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

// שליחת בקשת איפוס סיסמה במייל
export async function sendResetPasswordEmail(email) {
  return axios.post(`${BASE_URL}/forgot-password`, { email });
}

// שדרוג לתפקיד מוכר
export function upgradeUserRole(formData) {
  return axios.put(`${BASE_URL}/upgrade-role`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

// שינוי סיסמה לחשבון מחובר
export async function changePassword(email, currentPassword, newPassword) {
  try {
    const response = await axios.put(`${BASE_URL}/change-password`, {
      email,
      currentPassword,
      newPassword,
    });

    console.log("🔥 success response:", response);
    return response.data;
  } catch (error) {
    console.error("🔥 error response:", error);
    if (error.response?.data) {
      return error.response.data;
    }
    return { success: false, message: "שגיאה בשרת" };
  }
}
