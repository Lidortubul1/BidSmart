// src/components/LoginForm/LoginForm.jsx
// טופס התחברות: אימות אימייל/סיסמה, בדיקת חסימת משתמש, שמירת session בלוקאל סטורג', והצגת מודאל במקרה של שגיאה או חסימה.

import { useState } from "react";
import styles from "./LoginForm.module.css";
import { useAuth } from "../../auth/AuthContext";
import CustomModal from "../CustomModal/CustomModal";
import { loginUser } from "../../services/authApi.js";

export default function LoginForm({ onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();

  const [modalConfig, setModalConfig] = useState({
    show: false,
    title: "",
    message: "",
    confirmText: "סגור",
  });

  const showModal = (title, message) => {
    setModalConfig({
      show: true,
      title,
      message,
      confirmText: "סגור",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await loginUser(email, password);

      if (response.success) {
        const user = response.user;
        if (user.status === "blocked") {
          showModal(
            "משתמש חסום",
            "!ההנהלה חסמה את המשתמש \n :נא פנה למייל \n bidsmart123@gmail.com \n להמשך בירור"
          );
          return;
        }
        login(user);
        localStorage.setItem("user", JSON.stringify(user));
        onSuccess?.(user);
      } else {
        showModal("שגיאה", "אימייל או סיסמה לא נכונים");
      }
    } catch (err) {
      showModal("שגיאה", "שגיאה בשרת, נסה שוב מאוחר יותר");
    }
  };

  return (
    <>
      <form className={styles["login-form"]} onSubmit={handleSubmit}>
        <h2 className={styles["login-title"]}>התחברות</h2>

        <input
          type="email"
          placeholder="אימייל"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={styles["login-input"]}
          required
        />

        <input
          type="password"
          placeholder="סיסמה"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={styles["login-input"]}
          required
        />

        <button type="submit" className={styles["login-button"]}>
          התחבר
        </button>
      </form>

      {modalConfig.show && (
        <CustomModal
          title={modalConfig.title}
          message={modalConfig.message}
          confirmText={modalConfig.confirmText}
          onConfirm={() => setModalConfig((prev) => ({ ...prev, show: false }))}
        />
      )}
    </>
  );
}
