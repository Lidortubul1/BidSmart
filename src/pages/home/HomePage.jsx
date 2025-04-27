import styles from "./HomePage.module.css";
import { Link } from "react-router-dom";

function HomePage() {
  return (
    <div className={styles.container}>
      <div className={styles.welcomeSection}>
        <h1>ברוכים הבאים ל-BidSmart!</h1>
        <p>מכירות פומביות חכמות, מחירים נגישים לכולם.</p>
        <div className={styles.authLinks}>
          <Link to="/login" className={styles.loginLink}>
            התחברות
          </Link>
          <Link to="/register" className={styles.registerLink}>
            הרשמה
          </Link>
        </div>
      </div>

      <div className={styles.productsGrid}>
        {/* תצוגת מוצרים */}
        <div className={styles.productCard}>מוצר 1</div>
        <div className={styles.productCard}>מוצר 2</div>
        <div className={styles.productCard}>מוצר 3</div>
        <div className={styles.productCard}>מוצר 4</div>
        <div className={styles.productCard}>מוצר 5</div>
        <div className={styles.productCard}>מוצר 6</div>
      </div>
    </div>
  );
}

export default HomePage;
