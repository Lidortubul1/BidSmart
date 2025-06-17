import axios from "axios";

axios.defaults.baseURL = "http://localhost:5000";
axios.defaults.withCredentials = true;

const BASE_URL = "http://localhost:5000/api/auth";

// פונקציית התחברות
export async function loginUser(email, password) {
  try {
    const response = await axios.post("/api/auth/login", { email, password });
    return response.data;
  } catch (error) {
    console.error("Error logging in:", error);
    throw error;
  }
}


//פונקציית הרשמה שמחברת בין הפרונט לבאק 
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


//שולח בקשת איפוס סיסמה לשרת עם טוקן וסיסמה חדשה
export async function resetPassword(token, newPassword) {
  const response = await axios.post(`${BASE_URL}/reset-password`, {
    token,
    newPassword,
  });
  return response.data;
}

// שולח טופס עדכון פרופיל משתמש לשרת, כולל קבצים (תמונה, תעודת זהות)
export async function updateUserProfile(formData) {
  const response = await axios.put(`${BASE_URL}/update-profile`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    withCredentials: true,
  });
  return response.data;
}


// שליחת בקשה לאיפוס סיסמה
export async function sendResetPasswordEmail(email) {
  return axios.post(`${BASE_URL}/forgot-password`, {
    email,
  });
}

// שליחת בקשת שדרוג לתפקיד מוכר
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
    return response.data;
  } catch (error) {
    console.error("Error changing password:", error);
    return { success: false, message: "שגיאה בשרת" };
  }
}