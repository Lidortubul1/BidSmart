import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import ProductList from "../../components/productList/productList";
import styles from "./BuyerDashboard.module.css";
import CategoryBar from "../../components/CategoryBar/CategoryBar";
import { useState, useEffect } from "react";
import { fetchCategories } from "../../services/categoriesApi";

function BuyerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const goToBecomeSeller = () => {
    navigate("/become-seller");
  };

  const [categories, setCategories] = useState({});

  useEffect(() => {
    fetchCategories()
      .then((data) => setCategories(data))
      .catch((err) => console.error("שגיאה בטעינת קטגוריות:", err));
  }, []);

  return (
    <div className={styles.page}>
      <CategoryBar categories={categories} />

      <section className={styles.hero}>
        <div className={styles.heroText}>
          <h1>!ברוך הבא</h1>
          <p className={styles.subText}>
            צפה בכל המוצרים והשתתף במכרזים בזמן אמת.
          </p>
          <p className={styles.aiAssistantText}>
            המופיעה בצד השמאלי של המסך AI לכל שאלה על האתר ניתן לשאול את נציגת ה
          </p>
          <button onClick={goToBecomeSeller} className={styles.sellButton}>
            רוצה להתחיל למכור פריטים? לחץ כאן כדי להפוך למוכר
          </button>
        </div>
      </section>

      <section className={styles.productsSection}>
        <h2>כל המוצרים</h2>
        <ProductList />
      </section>
    </div>
  );
}

export default BuyerDashboard;
