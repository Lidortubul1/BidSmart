import ProductList from "../../components/productList/productList";
import CategoryBar from "../../components/CategoryBar/CategoryBar";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { fetchCategoriesWithSubs } from "../../services/categoriesApi";
import styles from "./HomePage.module.css";

function HomePage() {
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
          <h1>
            זה לא חלום
            <br />
            זו מכירה חכמה
          </h1>
          <p className={styles.subText}>
            למצוא מוצרים מדהימים בדרך פשוטה, חכמה ויעילה
          </p>

          <p className={styles.startText}>:התחילו עכשיו</p>
          <div className={styles.authLinks}>
            <Link to="/login" className={styles.loginLink}>
              התחברות
            </Link>
            <Link to="/register" className={styles.registerLink}>
              הרשמה
            </Link>
          </div>
          <p className={styles.aiAssistantText}>
            המופיעה בצד השמאלי של המסך AI לכל שאלה על האתר ניתן לשאול את נציגת ה
          </p>
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

export default HomePage;
