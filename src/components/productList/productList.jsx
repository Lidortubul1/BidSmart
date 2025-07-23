import { useEffect, useState } from "react";
import Product from "../productCard/product";
import styles from "./productList.module.css";
import { fetchAllProducts } from "../../services/productApi";

export default function ProductList({
  searchQuery = "",
  categoryFilter = "",
  subCategoryFilter = "",
}) {
  const [products, setProducts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 20;

  useEffect(() => {
    fetchAllProducts()
      .then(setProducts)
      .catch((error) => console.error("Failed to fetch products:", error));
  }, []);

  
  // סינון מוצרים לפי שאילתת חיפוש, קטגוריה ותת־קטגוריה
  const filteredProducts = products.filter((product) => {
    // הופך את שם המוצר ותיאורו לאותיות קטנות לצורך השוואה
    const name = product.product_name?.toLowerCase() || "";
    const desc = product.description?.toLowerCase() || "";

    // גם שאילתת החיפוש באותיות קטנות
    const query = searchQuery.toLowerCase();

    // בודק אם החיפוש תואם לשם או תיאור
    const matchesQuery = !query || name.includes(query) || desc.includes(query);

    // בודק התאמה לקטגוריה אם נבחרה אחת
    const matchesCategory =
      !categoryFilter || product.category === categoryFilter;

    // בודק התאמה לתת־קטגוריה אם נבחרה אחת
    const matchesSubCategory =
      !subCategoryFilter || product.sub_category === subCategoryFilter;

    // מחזיר true רק אם כל התנאים מתקיימים
    return matchesQuery && matchesCategory && matchesSubCategory;
  });

  // מחשב כמה עמודים יש לפי כמות מוצרים בעמוד
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);

  // מחשב את האינדקס של המוצר הראשון בעמוד הנוכחי
  const startIndex = (currentPage - 1) * productsPerPage;

  // גוזר מתוך המוצרים המסוננים רק את אלו שצריך להציג בעמוד הנוכחי
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
