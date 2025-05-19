import ProductList from "../../components/productList/productList";
import styles from "./SellerDashboard.module.css";
import { Link } from "react-router-dom";
import CategoryBar from "../../components/CategoryBar/CategoryBar";
import { useState, useEffect } from "react";
import axios from "axios";

function SellerDashboard() {
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
