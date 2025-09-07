//src\index.js
// קובץ הכניסה הראשי של האפליקציה
// טוען את ה־App ומריץ אותו בתוך BrowserRouter לניהול ניווט
// עוטף את האפליקציה ב־AuthProvider כדי לספק הקשר משתמש לכל הרכיבים
// נטען גם עיצוב בסיסי של Bootstrap

import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./app/App";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import "bootstrap/dist/css/bootstrap.min.css";


const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
