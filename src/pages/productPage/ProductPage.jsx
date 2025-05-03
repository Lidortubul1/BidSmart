// src/pages/productPage/ProductPage.jsx
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import styles from "./ProductPage.module.css";

function ProductPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);

  useEffect(() => {
    async function fetchProduct() {
      try {
        const response = await axios.get(`http://localhost:5000/api/product`);
        const found = response.data.find((p) => p.product_id === parseInt(id));
        setProduct(found);
      } catch (err) {
        console.error("שגיאה בטעינת מוצר:", err);
      }
    }

    fetchProduct();
  }, [id]);

  if (!product) return <p>טוען מוצר...</p>;

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <div className={styles.imageWrapper}>
          <img src={product.image} alt={product.product_name} className={styles.image} />
        </div>
        <div className={styles.details}>
          <h1>{product.product_name}</h1>
          <p className={styles.description}>{product.description}</p>
          <p className={styles.price}>מחיר פתיחה: {product.price} ₪</p>
          <p className={styles.status}>סטטוס: {product.product_status}</p>
          <button className={styles.bidButton}>הגש הצעה</button>
        </div>
      </div>
    </div>
  );
}

export default ProductPage;
