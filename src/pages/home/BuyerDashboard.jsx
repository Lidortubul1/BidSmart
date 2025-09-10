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

  const goToBecomeSeller = () => navigate("/become-seller");

  const handlePickCategory = ({ categoryId, subId }) => {
    setSelectedCategoryId(categoryId || "");
    setSelectedSubId(subId || "");
    // אופציונלי: לנקות חיפוש בעת בחירה
    // setSearchQuery("");
  };

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

  <div className={styles.searchContainer}>
    <input
      type="text"
      placeholder=" חפש מוצר לפי שם או תיאור..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className={styles.searchInput}
    />
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
  />
</section>

      </div>
    </>
  );
}

export default BuyerDashboard;
