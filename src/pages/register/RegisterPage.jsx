// src/pages/register/RegisterPage.jsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./RegisterPage.module.css";
import { registerUser } from "../../services/api";

function RegisterPage({ isModal = false, redirectAfterRegister = "/buyer" }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
  });

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
      alert("נרשמת בהצלחה!");
      navigate(redirectAfterRegister);
    } catch (err) {
      alert("שגיאה: " + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className={isModal ? styles.modalContainer : styles.container}>
      <div className={styles.formContainer}>
        <h1 className={styles.title}>הרשמה</h1>
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
      </div>
    </div>
  );
}

export default RegisterPage;
