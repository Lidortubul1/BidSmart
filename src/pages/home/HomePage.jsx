// src/pages/home/HomePage.jsx
import ProductList from "../../components/productList/productList";
import CategoryBar from "../../components/CategoryBar/CategoryBar";
import { Link } from "react-router-dom";
import { useState } from "react";
import styles from "./Landing.module.css";

function HomePage() {
  const [searchQuery, setSearchQuery] = useState("");

  // מסננים לפי קטגוריה/תת־קטגוריה
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedSubId, setSelectedSubId] = useState("");

  // מיון
  const [sortBy, setSortBy] = useState("");      // "", "price", "start_date"
  const [sortDir, setSortDir] = useState("asc"); // "asc" | "desc"

  const handlePickCategory = ({ categoryId, subId }) => {
    setSelectedCategoryId(categoryId || "");
    setSelectedSubId(subId || "");
    // אופציונלי: setSearchQuery("");
  };

  // טוגל מיון מחיר
  const toggleSortPrice = () => {
    if (sortBy !== "price") {
      setSortBy("price");
      setSortDir("asc"); // התחלה מהנמוך לגבוה
    } else {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    }
  };

  // טוגל מיון התחלת מכירה
  const toggleSortStart = () => {
    if (sortBy !== "start_date") {
      setSortBy("start_date");
      setSortDir("asc"); // התחלה מהקרובה לרחוקה
    } else {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    }
  };

  const priceLabel =
    sortBy === "price" && sortDir === "desc" ? "מהגבוה לנמוך" : "מהנמוך לגבוה";

  const startLabel =
    sortBy === "start_date" && sortDir === "desc"
      ? "הרחוקה ביותר"
      : "הקרובה ביותר";

  return (
    <div className={styles.page}>
      {/* CategoryBar במצב מוטמע — רק מדווח בחירה */}
      <CategoryBar embedded onPick={handlePickCategory} />

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

          <p className={styles.aiAssistantText}>
            לכל שאלה על האתר ניתן לשאול את נציגת ה-AI המופיעה בצד השמאלי של המסך
          </p>

        <div className={styles.authLinks}>
  <Link to="/login" className={styles.loginLink}>התחברות</Link>
  <Link to="/register" className={styles.registerLink}>הרשמה</Link>
</div>

        </div>
      </section>

      <section className={styles.productsSection}>
        <h2>כל המוצרים</h2>

        {/* שורת חיפוש + מיון */}
        <div className={styles.searchAndSortRow}>
          <div className={styles.searchContainer}>
            <input
              type="text"
              placeholder=" חפש מוצר לפי שם או תיאור..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.sortBar} role="group" aria-label="אפשרויות מיון">
            <button
              type="button"
              className={`${styles.sortBtn} ${sortBy === "price" ? styles.sortBtnActive : ""}`}
              onClick={toggleSortPrice}
              aria-pressed={sortBy === "price"}
              title="מיון לפי מחיר"
            >
              מחיר — {priceLabel}
            </button>

            <button
              type="button"
              className={`${styles.sortBtn} ${sortBy === "start_date" ? styles.sortBtnActive : ""}`}
              onClick={toggleSortStart}
              aria-pressed={sortBy === "start_date"}
              title="מיון לפי התחלת מכירה"
            >
              התחלת מכירה — {startLabel}
            </button>
          </div>
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
          sortBy={sortBy}
          sortDir={sortDir}
        />
      </section>
    </div>
  );
}

export default HomePage;
