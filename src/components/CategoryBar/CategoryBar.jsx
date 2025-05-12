import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./CategoryBar.module.css";

function CategoryBar({ categories }) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(null);

  const handleNavigate = (cat, sub = "") => {
    const query = sub
      ? `/search-results?category=${encodeURIComponent(
          cat
        )}&sub=${encodeURIComponent(sub)}`
      : `/search-results?category=${encodeURIComponent(cat)}`;
    navigate(query);
  };

  return (
    <div className={styles.categoryBar}>
      {Object.keys(categories).map((cat) => (
        <div
          key={cat}
          className={styles.categoryItem}
          onMouseEnter={() => setHovered(cat)}
          onMouseLeave={() => setHovered(null)}
        >
          <div
            className={styles.categoryButton}
            onClick={() => handleNavigate(cat)}
          >
            {cat}
          </div>

          {hovered === cat && (
            <div className={styles.subcategoryDropdown}>
              {categories[cat].map((sub) => (
                <div
                  key={sub}
                  className={styles.subcategoryItem}
                  onClick={() => handleNavigate(cat, sub)}
                >
                  {sub}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default CategoryBar;
