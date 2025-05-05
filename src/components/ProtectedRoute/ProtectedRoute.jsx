import { Navigate } from "react-router-dom";
import useAuth from "./../../auth/useAuth";

export default function ProtectedRoute({ element, roles }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;

  return element;
}
