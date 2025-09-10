// src/components/CategoryBar/CategoryBar.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./CategoryBar.module.css";
import { fetchCategoriesWithSubs } from "../../services/categoriesApi";

// הוסף פרופס: onPick (קולבק לבחירה) ו-embedded (ברירת מחדל false)
export default function CategoryBar({ onPick, embedded = false }) {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    async function loadCategories() {
      const data = await fetchCategoriesWithSubs();
      setCategories(data);
    }
    loadCategories();
  }, []);

  // פונקציה לזיהוי "אחר"
  const isOther = (name = "") =>
    name.trim().toLowerCase() === "אחר" || name.trim().toLowerCase() === "other";

  // מעבר/דיווח בחירה
  const handleSelect = (catId, subId = "") => {
    if (typeof onPick === "function") {
      onPick({ categoryId: catId, subId }); // ← מדווח להורה
      return;
    }
    if (!embedded) {
      const url = subId
        ? `/search-results?category=${catId}&sub=${subId}`
        : `/search-results?category=${catId}`;
      navigate(url);
    }
  };

  // סידור קטגוריות כך ש"אחר" תמיד בסוף
  const orderedCategories = categories.slice().sort((a, b) => {
    const aIsOther = isOther(a.name) ? 1 : 0;
    const bIsOther = isOther(b.name) ? 1 : 0;
    return aIsOther - bIsOther;
  });

  return (
    <div className={styles.wrapper}>
      <div className={styles.categoryBar}>
        {orderedCategories.map((cat) => (
          <div
            key={cat.id}
            className={`${styles.categoryButton} ${
              selectedCategory === cat.id ? styles.active : ""
            }`}
            onClick={() =>
              setSelectedCategory(selectedCategory === cat.id ? null : cat.id)
            }
            onDoubleClick={() => handleSelect(cat.id)}
          >
            {cat.name}
          </div>
        ))}
      </div>

      {selectedCategory && (
        <div className={styles.subCategoryRow}>
          {(() => {
            const subs =
              categories.find((cat) => cat.id === selectedCategory)
                ?.subcategories || [];

            // יוצרים עותק ממוין כך ש-"אחר" תמיד אחרונה
            const orderedSubs = subs.slice().sort((a, b) => {
              const aIsOther = isOther(a.name) ? 1 : 0;
              const bIsOther = isOther(b.name) ? 1 : 0;
              return aIsOther - bIsOther;
            });

            return orderedSubs.map((sub) => (
              <div
                key={sub.id}
                className={styles.subCategoryButton}
                onClick={() => handleSelect(selectedCategory, sub.id)}
              >
                {sub.name}
              </div>
            ));
          })()}
        </div>
      )}
    </div>
  );
}
