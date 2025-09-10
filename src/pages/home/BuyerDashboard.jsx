// src/pages/home/BuyerDashboard.jsx
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import ProductList from "../../components/productList/productList";
import CategoryBar from "../../components/CategoryBar/CategoryBar";
import { useState } from "react";
import styles from "./Landing.module.css";

function BuyerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedSubId, setSelectedSubId] = useState("");

  // מיון
  const [sortBy, setSortBy] = useState("");      // "", "price", "start_date"
  const [sortDir, setSortDir] = useState("asc"); // "asc" | "desc"

  const goToBecomeSeller = () => navigate("/become-seller");

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
    <>
      {!user ? <Navigate to="/login" replace /> : null}
      {user && user.role !== "buyer" ? <Navigate to="/" replace /> : null}

      <div className={styles.page}>
        <CategoryBar embedded onPick={handlePickCategory} />

        <section className={styles.hero}>
          <div className={styles.heroText}>
            <h1>ברוך הבא{user?.name ? `, ${user.name}` : ""}!</h1>
            <p className={styles.subText}>צפה בכל המוצרים והשתתף במכרזים בזמן אמת.</p>
            <p className={styles.aiAssistantText}>
              לכל שאלה על האתר ניתן לשאול את נציגת ה-AI המופיעה בצד השמאלי של המסך
            </p>
            <div className={styles.actions}>
              <button onClick={goToBecomeSeller} className={styles.actionButton}>
                רוצה להתחיל למכור פריטים? לחץ כאן כדי להפוך למוכר
              </button>
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

          {/* תקציר סינון + ניקוי */}
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
    </>
  );
}

export default BuyerDashboard;
