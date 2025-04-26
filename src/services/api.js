// src/services/api.js

export async function loginUser(email, password) {
  try {
    const response = await fetch("http://localhost:5000/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    return data; // מחזירים את התשובה ללקוח (ל-React)
  } catch (error) {
    console.error("Error logging in:", error);
    throw error;
  }

  
}

export async function registerUser(firstName, lastName, email, password) {
  try {
    const response = await fetch("http://localhost:5000/api/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ firstName, lastName, email, password }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error registering:", error);
    throw error;
  }
}

