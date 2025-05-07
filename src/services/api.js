import axios from "axios";

// פונקציית התחברות (ללא שינוי)
export async function loginUser(email, password) {
  try {
    const response = await axios.post("http://localhost:5000/api/login", {
      email,
      password,
    });
    return response.data;
  } catch (error) {
    console.error("Error logging in:", error);
    throw error;
  }
}

// פונקציית הרשמה מתוקנת עם שמות שמתאימים למסד הנתונים
export async function registerUser(firstName, lastName, email, password) {
  try {
    const response = await axios.post("http://localhost:5000/api/register", {
      first_name: firstName, // זה תואם לשם העמודה במסד
      last_name: lastName, // אותו דבר כאן
      email,
      password,
    });
    return response.data;
  } catch (error) {
    console.error("Error registering:", error);
    throw error;
  }
}

export async function addProduct(productData) {
  try {
    const response = await axios.post(
      "http://localhost:5000/api/product",
      productData,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    alert("המוצר נוסף בהצלחה!");
    return response.data;
  } catch (error) {
    alert(
      "שגיאה בהוספת מוצר: " + (error.response?.data?.error || error.message)
    );
    throw error;
  }
}
