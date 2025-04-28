import styles from "./RegisterPage.module.css";
import backgroundImage from "../../assets/images/background.jpg";
import { register } from "../../api";

function RegisterPage() {
  const doRegister = async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);

    const name = formData.get("name");
    const surname = formData.get("surname");
    const email = formData.get("email");
    const password = formData.get("password");

    await register(email, password);
  };

  return (
    <div
      className={styles.container}
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      <div className={styles.formContainer}>
        <h1 className={styles.title}>הרשמה</h1>
        <form onSubmit={doRegister} className={styles.form}>
          <input type="text" placeholder="שם פרטי" required />
          <input type="text" placeholder="שם משפחה" required />
          <input type="email" name="email" placeholder="אימייל" required />
          <input type="password" name="password" placeholder="סיסמה" required />
          <button type="submit">הירשם</button>
        </form>
      </div>
    </div>
  );
}

export default RegisterPage;
