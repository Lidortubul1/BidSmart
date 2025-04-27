import styles from "./LoginPage.module.css";
import backgroundImage from "../../assets/images/background.jpg";

function LoginPage() {
  return (
    <div
      className={styles.container}
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      <div className={styles.formContainer}>
        <h1 className={styles.title}>התחברות</h1>
        <form className={styles.form}>
          <input type="email" placeholder="אימייל" required />
          <input type="password" placeholder="סיסמה" required />
          <button type="submit">התחבר</button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
