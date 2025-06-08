// src/components/RegisterForm/RegisterForm.jsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerUser } from "../../services/api";
import CustomModal from "../CustomModal/CustomModal";
import styles from "./RegisterForm.module.css"; 

function RegisterForm({ redirectAfterRegister = "/buyer" }) {
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
  });

  const showModal = (title, message, onConfirm = null) => {
    setModal({
      show: true,
      title,
      message,
      confirmText: "סגור",
      onConfirm: onConfirm || (() => setModal({ ...modal, show: false })),
    });
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await registerUser(
        formData.first_name,
        formData.last_name,
        formData.email,
        formData.password
      );

      showModal("הרשמה בוצעה", "נרשמת בהצלחה!", () => {
        setModal({ ...modal, show: false });
        navigate(redirectAfterRegister);
      });
    } catch (err) {
      showModal(
        "שגיאה בהרשמה",
        err.response?.data?.message || err.message || "שגיאה לא ידועה"
      );
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          type="text"
          name="first_name"
          placeholder="שם פרטי"
          value={formData.first_name}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="last_name"
          placeholder="שם משפחה"
          value={formData.last_name}
          onChange={handleChange}
          required
        />
        <input
          type="email"
          name="email"
          placeholder="אימייל"
          value={formData.email}
          onChange={handleChange}
          required
        />
        <input
          type="password"
          name="password"
          placeholder="סיסמה"
          value={formData.password}
          onChange={handleChange}
          required
        />
        <button type="submit">הירשם</button>
      </form>

      {modal.show && (
        <CustomModal
          title={modal.title}
          message={modal.message}
          confirmText={modal.confirmText}
          onConfirm={modal.onConfirm}
        />
      )}
    </>
  );
}

export default RegisterForm;
