// src/pages/register/RegisterPage.jsx

import styles from "./RegisterPage.module.css";
import RegisterForm from "../../components/RegisterForm/RegisterForm";

function RegisterPage({ isModal = false, redirectAfterRegister = "/buyer" }) {
  return (
    <div className={isModal ? styles.modalContainer : styles.container}>
      <div className={styles.formContainer}>
        <h1 className={styles.title}>הרשמה</h1>
        <RegisterForm redirectAfterRegister={redirectAfterRegister} />
      </div>
    </div>
  );
}

export default RegisterPage;
