//src\pages\register\RegisterPage.jsx
// RegisterPage: עמוד הרשמה שמציג טופס RegisterForm, תומך במצב רגיל או כמודאל ומבצע הפניה לאחר הרשמה.

import styles from "./RegisterPage.module.css";
import RegisterForm from "../../components/RegisterForm/RegisterForm";

function RegisterPage({ isModal = false, redirectAfterRegister = "/buyer" }) {
  return (
    <div className={isModal ? styles.modalContainer : styles.container}>
      <div className={styles.formContainer}>
        <RegisterForm redirectAfterRegister={redirectAfterRegister} />
      </div>
    </div>
  );
}

export default RegisterPage;
