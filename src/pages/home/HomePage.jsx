import ProductList from "../../components/productList/productList";
import styles from "./HomePage.module.css";
import { Link } from "react-router-dom";
import CategoryBar from "../../components/CategoryBar/CategoryBar";
import { useState, useEffect } from "react";
import axios from "axios";

function HomePage() {

  const [categories, setCategories] = useState({});

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await axios.get("http://localhost:5000/api/categories");
        setCategories(res.data);
      } catch (err) {
        console.error("שגיאה בטעינת קטגוריות:", err);
      }
    }
    fetchCategories();
  }, []);
  return (
    <div className={styles.container}>
      <CategoryBar categories={categories} />
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
