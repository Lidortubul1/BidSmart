import ProductList from "../../components/productList/productList";
import styles from "./SellerDashboard.module.css";
import { Link } from "react-router-dom";
import CategoryBar from "../../components/CategoryBar/CategoryBar";
import { useState, useEffect } from "react";
import { fetchCategories } from "../../services/categoriesApi";

function SellerDashboard() {
  const [categories, setCategories] = useState({});

  useEffect(() => {
    fetchCategories()
      .then((data) => setCategories(data))
      .catch((err) => console.error("שגיאה בטעינת קטגוריות:", err));
  }, []);

  return (
    <div className={styles.container}>
      <div>
        <CategoryBar categories={categories} />
      </div>

      <div className={styles.welcomeSection}>
        <h1>BidSmart ברוך הבא לאתר</h1>
        <p>נהל את המוצרים שלך, הוסף מוצרים חדשים וצפה בדוחות.</p>

        <div className={styles.actions}>
          <Link to="/add-product" className={styles.actionButton}>
            + הוסף מוצר
          </Link>
          <Link to="/sales-report" className={styles.actionButton}>
            📊 דוחות מכירה
          </Link>
        </div>
      </div>

      <ProductList />
    </div>
  );
}

export default SellerDashboard;
