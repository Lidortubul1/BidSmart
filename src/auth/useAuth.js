//src\auth\useAuth.js
// הוק מותאם אישית: מחלץ את המשתמש מתוך LocalStorage בהעלאת הקומפוננטה ומחזיר אותו כמצב מקומי (user).

import { useEffect, useState } from "react";

export default function useAuth() {
  const [user, setUser] = useState(null);

  useEffect(() => {

    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) setUser(storedUser);
  }, []);

  return { user };
}
