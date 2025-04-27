import styles from "./RegisterPage.module.css";
import backgroundImage from "../../assets/images/background.jpg";

function RegisterPage() {
  return (
    <div
      className={styles.container}
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      <div className={styles.formContainer}>
        <h1 className={styles.title}>הרשמה</h1>
        <form className={styles.form}>
          <input type="text" placeholder="שם פרטי" required />
          <input type="text" placeholder="שם משפחה" required />
          <input type="email" placeholder="אימייל" required />
          <input type="password" placeholder="סיסמה" required />
          <button type="submit">הירשם</button>
        </form>
      </div>
    </div>
  );
}

export default RegisterPage;
