// src/components/ProductList.jsx
import { useEffect, useState } from "react";
import Product from "../productCard/product";
import styles from "./productList.module.css";
import axios from "axios";

export default function ProductList() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await axios.get("http://localhost:5000/api/product");
        setProducts(response.data);
      } catch (error) {
        console.error("Failed to fetch products:", error);
      }
    }

    fetchProducts();
  }, []);

  return (
    <div className={styles.productsGrid}>
      {products.length === 0 ? (
        <p>אין מוצרים להצגה.</p>
      ) : (
        products.map((product) => (
          <Product key={product.product_id} product={product} />
        ))
      )}
    </div>
  );
}
