import axios from "axios";

axios.defaults.baseURL = "http://localhost:5000";
axios.defaults.withCredentials = true;


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
    const response = await axios.post(
      "http://localhost:5000/api/auth/register",
      {
        first_name: firstName,
        last_name: lastName,
        email,
        password,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error registering:", error);
    throw error;
  }
}