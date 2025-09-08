import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerUser } from "../../services/authApi.js";
import CustomModal from "../CustomModal/CustomModal";
import styles from "./RegisterForm.module.css";
import { useAuth } from "../../auth/AuthContext";

function RegisterForm({ redirectAfterRegister = "/buyer" }) {
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    confirm_password: "", // ← חדש: אימות סיסמה
  });

  // מודאל כללי
  const [modal, setModal] = useState({
    show: false,
    title: "",
    message: "",
    confirmText: "סגור",
    onConfirm: () => setModal((m) => ({ ...m, show: false })),
    extraButtonText: "",
    onExtra: undefined,
    cancelText: "סגור",
    onCancel: () => setModal((m) => ({ ...m, show: false })),
  });

  const openModal = (opts) => setModal((m) => ({ ...m, show: true, ...opts }));
  const closeModal = () => setModal((m) => ({ ...m, show: false }));

  // בדיקת חוזק סיסמה: 6+ תווים, לפחות אות אחת ולפחות ספרה אחת
  const isStrongPassword = (pwd) =>
    typeof pwd === "string" &&
    pwd.length >= 6 &&
    /[A-Za-z]/.test(pwd) &&
    /\d/.test(pwd);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((fd) => ({ ...fd, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ולידציה מקומית לפני שליחה לשרת
    if (!isStrongPassword(formData.password)) {
      openModal({
        title: "סיסמה לא תקינה",
        message: "הסיסמה חייבת לכלול לפחות 6 תווים, אות אחת ומספר אחד.",
        confirmText: "סגור",
        onConfirm: closeModal,
      });
      return;
    }

    if (formData.password !== formData.confirm_password) {
      openModal({
        title: "אימות סיסמה נכשל",
        message: "השדות 'סיסמה' ו-'אימות סיסמה' אינם זהים.",
        confirmText: "סגור",
        onConfirm: closeModal,
      });
      return;
    }

    try {
      const res = await registerUser(
        formData.first_name,
        formData.last_name,
        formData.email,
        formData.password
      );

      if (res.user) {
        setUser(res.user);
      }

      openModal({
        title: "הרשמה בוצעה",
        message: "נרשמת בהצלחה!",
        extraButtonText: "מעבר לדף הבית",
        onExtra: () => {
          closeModal();
          navigate(redirectAfterRegister);
        },
        confirmText: "סגור",
        onConfirm: closeModal,
      });
    } catch (err) {
      const msgFromServer =
        err?.response?.data?.message ||
        err?.message ||
        "שגיאה לא ידועה";

      if (msgFromServer === "האימייל כבר קיים") {
        openModal({
          title: "שגיאה בהרשמה",
          message: "האימייל הזה כבר קיים במערכת.",
          extraButtonText: "מעבר להתחברות",
          onExtra: () => navigate("/login"),
          confirmText: "סגור",
          onConfirm: closeModal,
        });
      } else {
        openModal({
          title: "שגיאה בהרשמה",
          message: msgFromServer,
          confirmText: "סגור",
          onConfirm: closeModal,
        });
      }
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className={styles["register-form"]} noValidate>
        <h2 className={styles["register-title"]}>הרשמה</h2>

        <input
          type="text"
          name="first_name"
          placeholder="שם פרטי"
          value={formData.first_name}
          onChange={handleChange}
          className={styles["register-input"]}
          autoComplete="given-name"
          required
        />

        <input
          type="text"
          name="last_name"
          placeholder="שם משפחה"
          value={formData.last_name}
          onChange={handleChange}
          className={styles["register-input"]}
          autoComplete="family-name"
          required
        />

        <input
          type="email"
          name="email"
          placeholder="אימייל"
          value={formData.email}
          onChange={handleChange}
          className={styles["register-input"]}
          autoComplete="email"
          required
        />

        <input
          type="password"
          name="password"
          placeholder="סיסמה"
          value={formData.password}
          onChange={handleChange}
          className={styles["register-input"]}
          autoComplete="new-password"
          required
        />

        {/* חדש: אימות סיסמה */}
        <input
          type="password"
          name="confirm_password"
          placeholder="אימות סיסמה"
          value={formData.confirm_password}
          onChange={handleChange}
          className={styles["register-input"]}
          autoComplete="new-password"
          required
        />

        <button type="submit" className={styles["register-button"]}>
          הרשם
        </button>
      </form>

      {modal.show && (
        <CustomModal
          title={modal.title}
          message={modal.message}
          confirmText={modal.confirmText}
          onConfirm={modal.onConfirm}
          extraButtonText={modal.extraButtonText}
          onExtra={modal.onExtra}
        />
      )}
    </>
  );
}

export default RegisterForm;
