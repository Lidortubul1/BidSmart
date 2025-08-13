import { Link } from "react-router-dom";
import styles from "./productCard.module.css";

export default function Product({ product, showDescription = true }) {
  const firstImage = product.images?.[0]
    ? `http://localhost:5000${product.images[0]}`
    : "/placeholder.jpg";

  // חילוץ תאריך ושעה מתוך start_date המאוחד
  const date = new Date(product.start_date);

  const dateOnly = date.toLocaleDateString("he-IL");
  const timeOnly = date.toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <Link to={`/product/${product.product_id}`} className={styles.link}>
      <div className={styles.productCard}>
        <div className={styles.imageWrapper}>
          <img
            src={firstImage}
            alt={product.product_name}
            className={styles.productImage}
          />
        </div>

        <h3>{product.product_name}</h3>
        <p>מחיר פתיחה: ₪{product.price}</p>
        <p>ניתן להירשם עד התאריך: {dateOnly}</p>
        <p>בשעה: {timeOnly}</p>

        {showDescription && <p>{product.description}</p>}
      </div>
    </Link>
  );
}
