
import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

// יצירת קונטקסט (context) גלובלי עבור המשתמש המחובר
const AuthContext = createContext();

// קומפוננטת Provider שעוטפת את כל האפליקציה ומנהלת את מצב ההתחברות
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // המשתמש המחובר, null אם לא מחובר

  useEffect(() => {
    // בעת טעינת האפליקציה – מבצע בקשה לשרת לבדוק אם יש session קיים (עוגייה)
    axios
      .get("http://localhost:5000/api/auth/session", { withCredentials: true }) // שולח גם את העוגייה
      .then((res) => {
        if (res.data.loggedIn) {
          // אם השרת מאשר שהמשתמש מחובר – נשמור אותו ב־state
          setUser(res.data.user);
        }
      })
      .catch((err) => {
        // במקרה של שגיאה (שרת לא זמין / לא מחובר) – מדפיס שגיאה לקונסול
        console.error("שגיאה בבדיקת session:", err);
      });
  }, []); // רץ פעם אחת בלבד – כשנטען הקומפוננט

  // פונקציית התחברות – מקבלת את פרטי המשתמש ושומרת אותם ב־state
  const login = (userData) => {
    setUser(userData);
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
