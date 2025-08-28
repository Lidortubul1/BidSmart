// src/pages/home/SellerDashboard.jsx
import ProductList from "../../components/productList/productList";
import CategoryBar from "../../components/CategoryBar/CategoryBar";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { fetchCategoriesWithSubs } from "../../services/categoriesApi";
import styles from "./Landing.module.css"; // ← העיצוב המשותף

function SellerDashboard() {
  const [categories, setCategories] = useState({});
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchCategoriesWithSubs()
      .then((data) => setCategories(data))
      .catch((err) => console.error("שגיאה בטעינת קטגוריות:", err));
  }, []);

  return (
    <div className={styles.page}>
      <CategoryBar categories={categories} />

      <section className={styles.hero}>
        <div className={styles.heroText}>
          <h1>!ברוך הבא</h1>
          <p className={styles.subText}>נהל מכירות בצורה חכמה, הוסף מוצרים וצפה בדוחות בלחיצת כפתור</p>
          <p className={styles.aiAssistantText}>המופיעה בצד השמאלי של המסך AI לכל שאלה על האתר ניתן לשאול את נציגת ה</p>

          <div className={styles.actions}>
            <Link to="/add-product" className={styles.actionButton}>+ הוסף מוצר</Link>
            <Link to="/sales-report" className={styles.actionButton}>📊 דוחות מכירה</Link>
          </div>
        </div>
      </section>

      <section className={styles.productsSection}>
        <h2>כל המוצרים</h2>

        <div className={styles.searchContainer}>
          <input
            type="text"
            placeholder="🔍 חפש מוצר לפי שם או תיאור..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <ProductList searchQuery={searchQuery} />
      </section>
    </div>
  );
}

export default SellerDashboard;
