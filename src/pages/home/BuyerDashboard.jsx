// src/pages/home/BuyerDashboard.jsx
// דשבורד קונה (BuyerDashboard): מציג עמוד בית ייעודי לרוכש — כולל בר קטגוריות (CategoryBar), כותרת וברכה אישית, כפתור מעבר ל"הפוך למוכר", חיפוש מוצרים, ורשימת כל המוצרים (ProductList); מגיב לתפקיד המשתמש דרך useAuth ומבצע הפניות בהתאם.

import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import ProductList from "../../components/productList/productList";
import CategoryBar from "../../components/CategoryBar/CategoryBar";
import { useState, useEffect } from "react";
import { fetchCategoriesWithSubs } from "../../services/categoriesApi";
import styles from "./Landing.module.css"; // ← העיצוב המשותף

function BuyerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // הוקים — חייבים להיות לפני כל return
  const [categories, setCategories] = useState({});
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    // אם לא קונה — לא לעשות כלום בתוך האפקט (אבל ההוק עצמו עדיין נקרא תמיד)
    if (!user || user.role !== "buyer") return;
    fetchCategoriesWithSubs()
      .then((data) => setCategories(data))
      .catch((err) => console.error("שגיאה בטעינת קטגוריות:", err));
  }, [user]);

  const goToBecomeSeller = () => navigate("/become-seller");

  return (
    <>
      {/* שמירת תפקיד/הפניה — בתוך ה־render, לא לפני הוקים */}
      {!user ? <Navigate to="/login" replace /> : null}
      {user && user.role !== "buyer" ? <Navigate to="/" replace /> : null}

      <div className={styles.page}>
        <CategoryBar categories={categories} />

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
              placeholder="🔍 חפש מוצר לפי שם או תיאור..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <ProductList searchQuery={searchQuery} />
        </section>
      </div>
    </>
  );
}

export default BuyerDashboard;
