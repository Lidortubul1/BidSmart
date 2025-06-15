import axios from "axios";

// פונקציית התחברות
export async function loginUser(email, password) {
  try {
    const response = await axios.post("http://localhost:5000/api/auth/login", {
      email,
      password,
    });
    return response.data;
  } catch (error) {
    console.error("Error logging in:", error);
    throw error;
  }
}

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

//  ניהול משתמשים ע"י מנהל
export async function getAllUsers() {
  const response = await axios.get("http://localhost:5000/api/users");
  return response.data;
}

export async function updateUserStatus(id, status) {
  await axios.put(`http://localhost:5000/api/users/${id}/status`, { status });
}

export async function updateUserRole(id, role) {
  await axios.put(`http://localhost:5000/api/users/${id}/role`, { role });
}

export async function deleteUser(id) {
  await axios.delete(`http://localhost:5000/api/users/${id}`);
}
