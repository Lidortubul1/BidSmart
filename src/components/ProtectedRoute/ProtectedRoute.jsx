// components/ProtectedRoute/ProtectedRoute.jsx
// מסלול מוגן: מוודא שמשתמש מחובר ולו תפקיד מתאים; אם לא – מפנה ל־Login או לדף הבית.  
// תומך גם בטעינת סשן (loading) לפני החלטה על ניתוב.

import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

export default function ProtectedRoute({ element, roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null; // מחכים לבדיקת סשן

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return element;
}
