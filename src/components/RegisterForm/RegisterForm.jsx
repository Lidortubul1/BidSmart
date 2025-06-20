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
  });

  const [modal, setModal] = useState({
    show: false,
    title: "",
    message: "",
    confirmText: "סגור",
    onConfirm: () => setModal({ ...modal, show: false }),
    extraButtonText: "",
    onExtra: null,
  });

  const showModal = (
    title,
    message,
    onConfirm = null,
    extraButtonText = "",
    onExtra = null,
    cancelText = "סגור",
    onCancel = () => setModal({ ...modal, show: false })
  ) => {
    setModal({
      show: true,
      title,
      message,
      confirmText: cancelText,
      onConfirm,
      extraButtonText,
      onExtra,
      cancelText,
      onCancel,
    });
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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

      showModal(
        "הרשמה בוצעה",
        "נרשמת בהצלחה!",
        null,
        "מעבר לדף הבית",
        () => {
          setModal({ ...modal, show: false });
          navigate(redirectAfterRegister);
        },
        "",
        null
      );
    } catch (err) {
      if (err.response?.data?.message === "האימייל כבר קיים") {
        showModal(
          "שגיאה בהרשמה",
          "האימייל הזה כבר קיים במערכת.",
          () => setModal({ ...modal, show: false }),
          "מעבר להתחברות",
          () => navigate("/login"),
          "סגור",
          () => setModal({ ...modal, show: false })
        );
      } else {
        showModal(
          "שגיאה בהרשמה",
          err.response?.data?.message || err.message || "שגיאה לא ידועה"
        );
      }
    }
  };

  return (
    <>

      <form onSubmit={handleSubmit} className={styles.form}>
        <h2 className={styles.title}>הרשמה</h2>
        <input
          type="text"
          name="first_name"
          placeholder="שם פרטי"
          value={formData.first_name}
          onChange={handleChange}
          className={styles.input}
          required
        />
        <input
          type="text"
          name="last_name"
          placeholder="שם משפחה"
          value={formData.last_name}
          onChange={handleChange}
          className={styles.input}
          required
        />
        <input
          type="email"
          name="email"
          placeholder="אימייל"
          value={formData.email}
          onChange={handleChange}
          className={styles.input}
          required
        />
        <input
          type="password"
          name="password"
          placeholder="סיסמה"
          value={formData.password}
          onChange={handleChange}
          className={styles.input}
          required
        />
        <button type="submit" className={styles.button}>
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
