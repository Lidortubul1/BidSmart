import styles from "./ProfilePage.module.css";
import backgroundImage from "../../assets/images/background.jpg";

function ProfilePage() {
  return (
    <div
      className={styles.container}
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      <div className={styles.overlay}>
        <h1 className={styles.profileTitle}>Profile</h1>
      </div>

      <div className={styles.authButtons}>
        <button className={styles.loginButton}>התחברות</button>
        <button className={styles.registerButton}>הרשמה</button>
      </div>
    </div>
  );
}

export default ProfilePage;
