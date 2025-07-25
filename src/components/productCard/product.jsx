import { Link } from "react-router-dom";
import styles from "./productCard.module.css";

export default function Product({ product, showDescription = true }) {
  const firstImage = product.images?.[0]
    ? `http://localhost:5000${product.images[0]}`
    : "/placeholder.jpg";

  // איחוד תאריך ושעה
const dateOnly = product.start_date?.slice(0, 10);
const timeOnly = product.start_time;

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
        {/* <p>סטטוס: {product.product_status}</p> */}
        <p>ניתן להירשם עד התאריך: {dateOnly}</p>
        <p>בשעה :{timeOnly}</p>

        {showDescription && <p>{product.description}</p>}
      </div>
    </Link>
  );
}
