import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // בדיקה מול השרת אם יש session קיים
    axios
      .get("http://localhost:5000/api/auth/session", { withCredentials: true })
      .then((res) => {  
        if (res.data.loggedIn) {
          setUser(res.data.user);
        }
      })
      .catch((err) => {
        console.error("שגיאה בבדיקת session:", err);
      });
  }, []);

  const login = (userData) => {
    setUser(userData);
  };

  const logout = async () => {
    try {
      await axios.post(
        "http://localhost:5000/api/auth/logout",
        {},
        {
          withCredentials: true,
        }
      );
      setUser(null);
    } catch (err) {
      console.error("שגיאה בהתנתקות:", err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
