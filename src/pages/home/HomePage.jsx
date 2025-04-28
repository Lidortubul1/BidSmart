import ProductList from "../../components/productList/productList";
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

      {/* כאן נטען את רשימת המוצרים */}
      <ProductList />
    </div>
  );
}

export default HomePage;
