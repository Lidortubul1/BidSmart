import { useState } from "react";
import styles from "./StarRater.module.css";

export default function StarRater({ value = 0, onChange, size = 28, spacing = 8 }) {
  const [hover, setHover] = useState(0);
  const stars = [1, 2, 3, 4, 5];

  return (
    <div
      className={styles.wrap}
      style={{ "--size": `${size}px`, "--gap": `${spacing}px` }}
      dir="ltr"
      aria-label="בחירת דירוג בין 1 ל-5"
    >
      {stars.map((n) => {
        const filled = (hover || value) >= n;
        return (
          <button
            key={n}
            type="button"
            className={styles.starBtn}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange?.(n)}
            aria-label={`דרג ${n} כוכבים`}
            data-filled={filled}
          >
            ★
          </button>
        );
      })}
    </div>
  );
}
