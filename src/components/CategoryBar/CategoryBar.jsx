import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./CategoryBar.module.css";

function CategoryBar({ categories }) {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState(null);

  const handleNavigate = (cat, sub = "") => {
    const query = sub
      ? `/search-results?category=${encodeURIComponent(
          cat
        )}&sub=${encodeURIComponent(sub)}`
      : `/search-results?category=${encodeURIComponent(cat)}`;
    navigate(query);
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.categoryBar}>
        {Object.keys(categories).map((cat) => (
          <div
            key={cat}
            className={`${styles.categoryButton} ${
              selectedCategory === cat ? styles.active : ""
            }`}
            onClick={() =>
              setSelectedCategory(cat === selectedCategory ? null : cat)
            }
          >
            {cat}
          </div>
        ))}
      </div>

      {selectedCategory && (
        <div className={styles.subCategoryRow}>
          {categories[selectedCategory].map((sub) => (
            <div
              key={sub}
              className={styles.subCategoryButton}
              onClick={() => handleNavigate(selectedCategory, sub)}
            >
              {sub}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CategoryBar;
