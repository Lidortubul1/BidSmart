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

  // מעבר/דיווח בחירה
  const handleSelect = (catId, subId = "") => {
    if (typeof onPick === "function") {
      onPick({ categoryId: catId, subId });   // ← מדווח להורה
      return;
    }
    if (!embedded) {
      const url = subId
        ? `/search-results?category=${catId}&sub=${subId}`
        : `/search-results?category=${catId}`;
      navigate(url);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.categoryBar}>
        {categories.map((cat) => (
          <div
            key={cat.id}
            className={`${styles.categoryButton} ${selectedCategory === cat.id ? styles.active : ""}`}
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
          {categories
            .find((cat) => cat.id === selectedCategory)
            ?.subcategories.map((sub) => (
              <div
                key={sub.id}
                className={styles.subCategoryButton}
                onClick={() => handleSelect(selectedCategory, sub.id)} // ← לא מנווט אם embedded/onPick
              >
                {sub.name}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
