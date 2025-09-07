//src\components\RoleRoute\RoleRoute.jsx
// ניתוב לפי תפקיד: מציג קומפוננטה רק אם המשתמש מחזיק בתפקיד מתאים (roles).  
// אם אין הרשאה → מפנה אוטומטית ללוח התפקיד שלו, או לדף הבית כברירת מחדל.  

import { Navigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

/**
 * RoleRoute - מציג רכיב רק אם ל-user יש אחד מהתפקידים ב-roles.
 * אם אין הרשאה, מפנה אוטומטית ללוח המתאים לפי התפקיד של המשתמש.
 */
export default function RoleRoute({ element, roles }) {
  const { user, loading } = useAuth();

  if (loading) return null;               // אפשר לשים כאן ספינר
  if (!user) return <Navigate to="/login" replace />;

  // מותר?
  if (roles?.includes(user.role)) return element;

  // לא מותר → מפנים ללוח של התפקיד שלו
  const fallbackByRole = {
    buyer:  "/buyer",
    seller: "/seller",
    admin:  "/admin",
  };

  return <Navigate to={fallbackByRole[user.role] || "/"} replace />;
}
