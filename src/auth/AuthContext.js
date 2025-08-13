import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true); // ✅ דגל טעינה פנימי

  console.log("user:", user);

  // הידרציה מוקדמת מה-LocalStorage (לא חובה, אבל נעים ל-UX)
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));
  }, []);

  // בדיקת סשן מול השרת
useEffect(() => {
  (async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/auth/session", { withCredentials: true });
      if (res.data?.loggedIn && res.data.user) {
        setUser(prev => ({ ...(prev || {}), ...res.data.user }));
      } else {
        // 👈 חשוב: אם אין סשן, ננקה את המשתמש
        setUser(null);
        localStorage.removeItem("user");
      }
    } catch (err) {
      console.error("שגיאה בבדיקת session:", err);
      // 👈 גם במקרה שגיאה—להיזהר מלהשאיר user “ישן”
      setUser(null);
      localStorage.removeItem("user");
    } finally {
      setInitializing(false);
    }
  })();
}, []);


  // 🧩 סנכרון user ל-localStorage בכל שינוי (אופציונלי אך מומלץ)
  useEffect(() => {
    if (user) localStorage.setItem("user", JSON.stringify(user));
    else localStorage.removeItem("user");
  }, [user]);

  const login = (userData) => {
    setUser(userData);
    // localStorage יתעדכן אוטומטית מה-useEffect שמעל
  };

  const logout = async () => {
    try {
      await axios.post("http://localhost:5000/api/auth/logout", {}, { withCredentials: true });
    } catch (err) {
      console.error("שגיאה בהתנתקות:", err);
    } finally {
      setUser(null);
      localStorage.removeItem("user"); // ניקוי מפורש (ליתר ביטחון)
    }
  };

  // בזמן הטעינה הראשונית אפשר להחזיר null כדי למנוע הבהוב
  if (initializing) return null;

  // 👈 השורה החשובה: חושפים loading שממופה ל-initializing
  return (
    <AuthContext.Provider value={{ user, loading: initializing, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
