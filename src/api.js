// api.js
import React, { useEffect, useState } from "react";
// ייבוא axios - ספרייה לביצוע בקשות HTTP
import axios from "axios";

// פונקציה לרישום משתמש חדש
export async function register(email, password) {
  try {
    // המרת נתוני המשתמש לאובייקט JSON
    const data = JSON.stringify({
      email: email,
      password: password,
      firstName: "Test", // שם פרטי זמני (לצורך בדיקה)
      lastName: "User", // שם משפחה זמני (לצורך בדיקה)
    });

    // שליחת בקשת POST לשרת במסלול /api/register
    const test = await axios.post("http://localhost:5000/api/register", data, {
      headers: {
        "Content-Type": "application/json", // הגדרת סוג התוכן ל-JSON
      },
    });

    // אם הצליח - הצגת Alert
    alert("ok");
  } catch (e) {
    // במקרה של שגיאה - הצגת הודעת השגיאה
    alert(JSON.stringify(e.response?.data || e.status));
  }
}

// פונקציה להתחברות משתמש קיים
export async function login(email, password) {
  try {
    // המרת נתוני ההתחברות לאובייקט JSON
    const data = JSON.stringify({
      email: email,
      password: password,
    });

    // שליחת בקשת POST לשרת במסלול /api/login
    await axios.post("http://localhost:5000/api/login", data);

    // אם הצליח - הצגת Alert
    alert("ok");
  } catch (e) {
    // במקרה של שגיאה - הצגת השגיאה
    alert(String(e));
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

    alert("Product added successfully!");
    console.log(response.data);
  } catch (error) {
    alert(
      "Failed to add product: " + (error.response?.data?.error || error.message)
    );
  }
}
