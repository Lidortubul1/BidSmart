import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./CategoryBar.module.css";
import { fetchCategoriesWithSubs } from "../../services/categoriesApi";

export default function CategoryBar() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    async function loadCategories() {
      const data = await fetchCategoriesWithSubs();
      setCategories(data); // שימי לב: זה צריך להיות מערך, לא אובייקט!
    }
    loadCategories();
  }, []);

  // מעבר עם id, כמו שצריך!
  const handleNavigate = (catId, subId = "") => {
    const url = subId
      ? `/search-results?category=${catId}&sub=${subId}`
      : `/search-results?category=${catId}`;
    navigate(url);
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.categoryBar}>
        {categories.map((cat) => (
          <div
            key={cat.id}
            className={`${styles.categoryButton} ${
              selectedCategory === cat.id ? styles.active : ""
            }`}
            // לחיצה על הקטגוריה — מסמנת אותה ופותחת תתי־קטגוריה
            onClick={() =>
              setSelectedCategory(selectedCategory === cat.id ? null : cat.id)
            }
            onDoubleClick={() => handleNavigate(cat.id)} // לחיצה כפולה תשלח לחיפוש כללי לקטגוריה
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
                onClick={() => handleNavigate(selectedCategory, sub.id)}
              >
                {sub.name}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
