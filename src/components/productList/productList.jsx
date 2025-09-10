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
  // חדש: מיון
  sortBy = "",        // "", "price", "start_date"
  sortDir = "asc",    // "asc" | "desc"
}) {
  const [products, setProducts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 20;

  // קובע את המסננים האפקטיביים (חדשים > ישנים)
  const effectiveCategory = useMemo(() => {
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

  // איפוס עמוד בעת שינוי חיפוש/מסננים/מיון
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, effectiveCategory, effectiveSub, sortBy, sortDir]);

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

  // מיון (לפני פאג'ינציה)
// מיון (לפני פאג'ינציה)
const sortedProducts = useMemo(() => {
  if (!sortBy) return filteredProducts;

  const dir = sortDir === "desc" ? -1 : 1;

  // מנרמל מחיר: תומך בסימני מטבע/פסיקים ושמות שדות שונים
  const parsePrice = (val) => {
    if (val == null) return NaN;
    if (typeof val === "number") return val;
    // הופך "₪1,299.90" → "1299.90"
    const cleaned = String(val).replace(/[^\d.-]/g, "").replace(/(\..*)\./g, "$1"); 
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : NaN;
  };

  const getPrice = (p) => {
    // סדר עדיפויות רחב לשמות שדות אפשריים
    const candidates = [
      p.current_price,
      p.currentPrice,
      p.price,
      p.starting_price,
      p.start_price,
      p.base_price,
      p.min_price,
      p.price_before_vat,
    ];
    for (const c of candidates) {
      const n = parsePrice(c);
      if (Number.isFinite(n)) return n;
    }
    return NaN; // אין מחיר תקין
  };

  const getStart = (p) => {
    const raw = p.start_date ?? p.startDate ?? p.start_at ?? null;
    const t = raw ? new Date(raw).getTime() : NaN;
    return Number.isFinite(t) ? t : NaN;
  };

  const arr = filteredProducts.slice();

  if (sortBy === "price") {
    arr.sort((a, b) => {
      const av = getPrice(a);
      const bv = getPrice(b);

      const aHas = Number.isFinite(av);
      const bHas = Number.isFinite(bv);
      if (aHas && !bHas) return -dir;  // בלי מחיר → לסוף
      if (!aHas && bHas) return dir;
      if (!aHas && !bHas) return 0;

      if (av === bv) return 0;
      return av > bv ? dir : -dir;
    });
  } else if (sortBy === "start_date") {
    arr.sort((a, b) => {
      const av = getStart(a);
      const bv = getStart(b);

      const aHas = Number.isFinite(av);
      const bHas = Number.isFinite(bv);
      if (aHas && !bHas) return -dir; // בלי תאריך → לסוף
      if (!aHas && bHas) return dir;
      if (!aHas && !bHas) return 0;

      if (av === bv) return 0;
      return av > bv ? dir : -dir;
    });
  }

  return arr;
}, [filteredProducts, sortBy, sortDir]);

  // פאג'ינציה אחרי מיון
  const totalPages = Math.ceil(sortedProducts.length / productsPerPage);
  const startIndex = (currentPage - 1) * productsPerPage;
  const currentProducts = sortedProducts.slice(
    startIndex,
    startIndex + productsPerPage
  );

  return (
    <div className={styles.container}>
      <div className={styles.productsWrapper}>
        {sortedProducts.length === 0 ? (
          <p className={styles.empty}>לא נמצאו מוצרים תואמים.</p>
        ) : (
          <>
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
