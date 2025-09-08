// src/components/productList/productList.jsx
import { useEffect, useState, useMemo } from "react";
import Product from "../productCard/product";
import styles from "./productList.module.css";
import { fetchAllProducts } from "../../services/productApi";

export default function ProductList({
  searchQuery = "",
  // תמיכה לאחור:
  categoryFilter = "",
  subCategoryFilter = "",
  // תמיכה בפרופסים החדשים:
  categoryId,
  subId,
}) {
  const [products, setProducts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 20;

  // קובע את המסננים האפקטיביים (חדשים > ישנים)
  const effectiveCategory = useMemo(() => {
    // אם categoryId הועבר (גם אם 0), נשתמש בו; אחרת ניקח מהישן
    return (categoryId ?? categoryFilter) || "";
  }, [categoryId, categoryFilter]);

  const effectiveSub = useMemo(() => {
    return (subId ?? subCategoryFilter) || "";
  }, [subId, subCategoryFilter]);

  useEffect(() => {
    fetchAllProducts()
      .then(setProducts)
      .catch((error) => console.error("Failed to fetch products:", error));
  }, []);

  // איפוס עמוד בעת שינוי חיפוש/מסננים
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, effectiveCategory, effectiveSub]);

  // סינון מוצרים לפי שאילתת חיפוש, קטגוריה ותת־קטגוריה
  const filteredProducts = useMemo(() => {
    const q = (searchQuery || "").toLowerCase();
    const catStr = String(effectiveCategory || "");
    const subStr = String(effectiveSub || "");

    return products.filter((product) => {
      const name = (product.product_name || "").toLowerCase();
      const desc = (product.description || "").toLowerCase();

      const matchesQuery = !q || name.includes(q) || desc.includes(q);
      const matchesCategory =
        !catStr || String(product.category_id) === catStr;
      const matchesSubCategory =
        !subStr || String(product.subcategory_id) === subStr;

      return matchesQuery && matchesCategory && matchesSubCategory;
    });
  }, [products, searchQuery, effectiveCategory, effectiveSub]);

  // פאג'ינציה
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  const startIndex = (currentPage - 1) * productsPerPage;
  const currentProducts = filteredProducts.slice(
    startIndex,
    startIndex + productsPerPage
  );

  return (
    <div className={styles.container}>
      <div className={styles.productsWrapper}>
        {filteredProducts.length === 0 ? (
          <p className={styles.empty}>לא נמצאו מוצרים תואמים.</p>
        ) : (
          <>
            <p className={styles.countInfo}>
              נמצאו {filteredProducts.length} מוצרים
            </p>

            <div className={styles.productsGrid}>
              {currentProducts.map((product) => (
                <Product
                  key={product.product_id}
                  product={product}
                  showDescription={false}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className={styles.pagination}>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`${styles.pageButton} ${
                      currentPage === i + 1 ? styles.activePage : ""
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
