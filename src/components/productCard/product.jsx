// src/components/Product.jsx
import styles from "./productCard.module.css";

export default function Product({ product }) {
  return (
    <div className={styles.productCard}>
      {product.image && (
        <img
          src={product.image}
          alt={product.product_name}
          className={styles.productImage}
        />
      )}
      <h3>{product.product_name}</h3>
      <p>מחיר פתיחה: {product.price} ₪</p>
      <p>סטטוס: {product.product_status}</p>
      <p>{product.description}</p>
    </div>
  );
}
