import ProductList from "../../components/productList/productList";
import CategoryBar from "../../components/CategoryBar/CategoryBar";
import { Link } from "react-router-dom";
import { useState } from "react";
import styles from "./Landing.module.css";

function SellerDashboard() {
  const [searchQuery, setSearchQuery] = useState("");

  // מסננים לפי קטגוריה/תת־קטגוריה (כמו בדף הקונה)
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedSubId, setSelectedSubId] = useState("");

  const handlePickCategory = ({ categoryId, subId }) => {
    setSelectedCategoryId(categoryId || "");
    setSelectedSubId(subId || "");
    // אופציונלי: setSearchQuery("");
  };

  return (
    <div className={styles.page}>
      {/* CategoryBar במצב מוטמע — רק מדווח בחירה */}
      <CategoryBar embedded onPick={handlePickCategory} />

      <section className={styles.hero}>
        <div className={styles.heroText}>
          <h1>!ברוך הבא</h1>
          <p className={styles.subText}>
            נהל מכירות בצורה חכמה, הוסף מוצרים וצפה בדוחות בלחיצת כפתור
          </p>
          <p className={styles.aiAssistantText}>
            לכל שאלה על האתר ניתן לשאול את נציגת ה-AI המופיעה בצד השמאלי של המסך
          </p>

          <div className={styles.actions}>
            <Link to="/add-product" className={styles.actionButton}>+ הוסף מוצר</Link>
            <Link to="/sales-report" className={styles.actionButton}>📊 סטטיסטיקת מכירות</Link>
          </div>
        </div>
      </section>

      <section className={styles.productsSection}>
        <h2>כל המוצרים</h2>

        <div className={styles.searchContainer}>
          <input
            type="text"
            placeholder=" חפש מוצר לפי שם או תיאור..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        {/* תקציר סינון + ניקוי — אותם classNames כמו בדף קונה */}
        {(selectedCategoryId || selectedSubId) && (
          <div className={styles.filterBar}>
            <button
              type="button"
              className={styles.clearFilterBtn}
              onClick={() => {
                setSelectedCategoryId("");
                setSelectedSubId("");
              }}
            >
              ✖ ניקוי סינון (הצג הכל)
            </button>
          </div>
        )}

        <ProductList
          searchQuery={searchQuery}
          categoryId={selectedCategoryId}
          subId={selectedSubId}
        />
      </section>
    </div>
  );
}

export default SellerDashboard;
