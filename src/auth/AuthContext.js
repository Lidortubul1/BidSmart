import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true); // ✅ דגל טעינה פנימי

  console.log("user:", user);

useEffect(() => {
  const stored = localStorage.getItem("user");
  if (stored) setUser(JSON.parse(stored)); // הידרציה מוקדמת
}, []);

useEffect(() => {
  (async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/auth/session", { withCredentials: true });
      if (res.data?.loggedIn && res.data.user) {
        setUser(prev => ({ ...(prev || {}), ...res.data.user })); // ← מיזוג, לא דריסה
      }
    } catch (err) {
      console.error("שגיאה בבדיקת session:", err);
    } finally {
      setInitializing(false);
    }
  })();
}, []);





  const login = (userData) => setUser(userData);

  const logout = async () => {
    try {
      await axios.post(
        "http://localhost:5000/api/auth/logout",
        {},
        { withCredentials: true }
      );
      setUser(null);
    } catch (err) {
      console.error("שגיאה בהתנתקות:", err);
    }
  };

  // ✅ בזמן הטעינה הראשונית לא מרנדרים את הילדים (מונע גישה ל-user=null)
  if (initializing) return null;

  return (
    <AuthContext.Provider value={{ user, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

