// src/components/productCard/product.jsx
import { Link } from "react-router-dom";
import styles from "./productCard.module.css";

export default function Product({ product }) {
  return (
    <Link to={`/product/${product.product_id}`} className={styles.link}>
      <div className={styles.productCard}>
        <div className={styles.imageWrapper}>
          {product.image && (
            <img
              src={product.image}
              alt={product.product_name}
              className={styles.productImage}
            />
          )}
        </div>
        <h3>{product.product_name}</h3>
        <p>מחיר פתיחה: ₪{product.price} </p>
        <p>סטטוס: {product.product_status}</p>
        <p>{product.description}</p>
      </div>
    </Link>
  );
}
