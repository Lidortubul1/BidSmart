
import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

// יצירת קונטקסט (context) גלובלי עבור המשתמש המחובר
const AuthContext = createContext();

// קומפוננטת Provider שעוטפת את כל האפליקציה ומנהלת את מצב ההתחברות
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // המשתמש המחובר, null אם לא מחובר

  
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    axios
      .get("http://localhost:5000/api/auth/session", { withCredentials: true })
      .then((res) => {
        if (res.data.loggedIn) {
          setUser(res.data.user);
          localStorage.setItem("user", JSON.stringify(res.data.user));
        }
      })
      .catch((err) => {
        console.error("שגיאה בבדיקת session:", err);
      });
  }, []);
  


  // פונקציית התחברות – מקבלת את פרטי המשתמש ושומרת אותם ב־state
  const login = (userData) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  };
  

  // פונקציית התנתקות – שולחת לשרת בקשת logout ומנקה את המשתמש המקומי
  const logout = async () => {
    try {
      await axios.post(
        "http://localhost:5000/api/auth/logout", // נקודת ההתנתקות בשרת
        {},
        {
          withCredentials: true, // שומר על שליחת העוגייה לשרת
        }
      );
      localStorage.removeItem("user"); // מוחק גם מה־localStorage
      setUser(null); // מנקה את המשתמש מתוך הקונטקסט
    } catch (err) {
      console.error("שגיאה בהתנתקות:", err);
    }
  };

  // מחזיר את ה־context לכל הקומפוננטות שהמערכת עוטפת – כולל המשתמש והפונקציות
  return (
    <AuthContext.Provider value={{ user, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// פונקציה נוחה לשליפת המידע מה־context מתוך קומפוננטות
export function useAuth() {
  return useContext(AuthContext);
}
