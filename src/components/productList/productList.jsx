import { useEffect, useState } from "react";
import Product from "../productCard/product";
import styles from "./productList.module.css";
import axios from "axios";

export default function ProductList({
  searchQuery = "",
  categoryFilter = "",
  subCategoryFilter = "",
}) {
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

  const filteredProducts = products.filter((product) => {
    const name = product.product_name?.toLowerCase() || "";
    const desc = product.description?.toLowerCase() || "";
    const query = searchQuery.toLowerCase();

    const matchesQuery = !query || name.includes(query) || desc.includes(query);

    const matchesCategory =
      !categoryFilter || product.category === categoryFilter;

    const matchesSubCategory =
      !subCategoryFilter || product.sub_category === subCategoryFilter;

    return matchesQuery && matchesCategory && matchesSubCategory;
  });

  return (
    <div className={styles.container}>
      <div className={styles.productsWrapper}>
        {filteredProducts.length === 0 ? (
          <p className={styles.empty}>לא נמצאו מוצרים תואמים.</p>
        ) : (
          <div className={styles.productsGrid}>
            {filteredProducts.map((product) => (
              <Product key={product.product_id} product={product} showDescription={false} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
  
}
