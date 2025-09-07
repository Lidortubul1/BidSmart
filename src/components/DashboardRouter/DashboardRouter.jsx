//src\components\DashboardRouter\DashboardRouter.jsx
// ראוטר ניתוב דשבורד: בודק משתמש לפי תפקיד (admin/seller/buyer) ומפנה לעמוד המתאים, אחרת מחזיר לדף הבית.

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

export default function DashboardRouter() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate("/");
    } else if (user.role === "admin") {
      navigate("/admin");
    } else if (user.role === "seller") {
      navigate("/seller");
    } else {
      navigate("/buyer");
    }
  }, [user]);

  return null;
}
