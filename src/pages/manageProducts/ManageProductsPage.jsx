// pages/manageProducts/ManageProductsPage.jsx
// דף ניהול מוצרים (Seller) עם אפשרויות כמו בדף המנהל:
// - נשאר: טעינה דרך getSellerProducts(filter) לפי תפריט המסננים הקיים
// - נשאר: חיפוש רחב, מיון, באדג' ספירה, ייצוא לפי התוצאות המסוננות והממוינות
// - נשאר: צפייה במודאל פרטים (לא ניווט)
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, useMemo } from "react";
import styles from "./ManageProductsPage.module.css";
import SellerCard from "./SellerCard.jsx";
import ProductDetailsModal from "../../components/ProductDetailsModal/ProductDetailsModal";
import { getSellerProducts } from "../../services/ManagementApi.js";
import { exportProductsToExcel } from "../../utils/exportProductsToExcel.jsx";

const FILTERS = [
  { value: "all",          label: "כל המוצרים" },
  { value: "forSale",      label: "מוצרים שטרם חלה המכירה" },  // status = for_sale
  { value: "sold",         label: "כל המוצרים שנמכרו" },       // status = sale
  { value: "soldDelivery", label: "נמכרו - משלוח" },           // status = sale + delivery_method = delivery
  { value: "soldPickup",   label: "נמכרו - איסוף עצמי" },      // status = sale + delivery_method = pickup
  { value: "notSold",      label: "מוצרים שלא נמכרו" },        // status = Not sold
  { value: "blocked",      label: "מוצרים חסומים על ידי" },     // status = blocked
  { value: "adminBlocked", label: "מוצרים חסומים על ידי ההנהלה" } // status = admin blocked
];

// אפשרויות מיון לתפריט ה"נפתח" (כמו "כל המוצרים")
const SORT_OPTIONS = [
  { value: "start_desc", label: "מיון- מישן לחדש" },
  { value: "start_asc",  label: "מיון- מחדש לישן" },
  { value: "price_desc", label: "מחיר- מגבוה לנמוך" },
  { value: "price_asc",  label: "מחיר- מנמוך לגבוה" },
];

export default function ManageProductsPage() {
  const [products, setProducts] = useState([]);
  const [filter, setFilter] = useState("all");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [sortBy, setSortBy] = useState("start_desc"); // start_desc | start_asc | price_desc | price_asc
  const [isSortOpen, setIsSortOpen] = useState(false);

  const pickerRef = useRef(null);
  const sortPickerRef = useRef(null);

  const navigate = useNavigate();

  useEffect(() => {
    async function fetchProducts() {
      const data = await getSellerProducts(filter);
      setProducts(Array.isArray(data) ? data : []);
    }
    fetchProducts();
  }, [filter]);

  useEffect(() => {
    function onDocClick(e) {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
      if (sortPickerRef.current && !sortPickerRef.current.contains(e.target)) {
        setIsSortOpen(false);
      }
    }
    function onEsc(e) {
      if (e.key === "Escape") {
        setIsMenuOpen(false);
        setIsSortOpen(false);
      }
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  const filteredProducts = useMemo(() => {
    let data = products;

    const s = (searchQuery || "").trim().toLowerCase();
    if (s.length > 0) {
      data = data.filter((p) =>
        (p.product_name || "").toLowerCase().includes(s) ||
        (p.category_name || "").toLowerCase().includes(s) ||
        (p.subcategory_name || "").toLowerCase().includes(s) ||
        String(p.product_id || "").includes(s)
      );
    }

    const by = (a, b) => {
      const sa = new Date(a.start_date || 0).getTime();
      const sb = new Date(b.start_date || 0).getTime();
      const pa = Number(a.current_price || 0);
      const pb = Number(b.current_price || 0);

      switch (sortBy) {
        case "start_desc": return sb - sa;   // חדש→ישן
        case "start_asc":  return sa - sb;   // ישן→חדש
        case "price_desc": return pb - pa;   // מחיר גבוה→נמוך
        case "price_asc":  return pa - pb;   // מחיר נמוך→גבוה
        default:           return sb - sa;
      }
    };

    return [...data].sort(by);
  }, [products, searchQuery, sortBy]);

  const currentFilterLabel = FILTERS.find(f => f.value === filter)?.label || "";
  const currentSortLabel   = SORT_OPTIONS.find(o => o.value === sortBy)?.label || "";

  function exportToExcel() {
    const label = FILTERS.find(f => f.value === filter)?.label || "";
    const sortLabelMap = {
      start_desc: "מועד התחלה (חדש→ישן)",
      start_asc:  "מועד התחלה (ישן→חדש)",
      price_desc: "מחיר נוכחי (מהגבוה לנמוך)",
      price_asc:  "מחיר נוכחי (מהנמוך לגבוה)",
    };

    exportProductsToExcel(filteredProducts, {
      viewer: "seller",
      filterLabel: `${label} • מיון: ${sortLabelMap[sortBy] || ""}`
    });
  }

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.heroText}>
          <h1>ניהול המוצרים שלי</h1>
          <p className={styles.subText}>דף פירוט סטטוס המוצרים שלך</p>

          {/* שורת בקרים ממורכזת: פילטר + מיון */}
          <div className={styles.controlsRow}>
            {/* תפריט מסנן צד־שרת */}
            <div className={styles.filterBar} ref={pickerRef}>
              <button
                type="button"
                className={styles.filterTrigger}
                onClick={() => setIsMenuOpen((v) => !v)}
                aria-expanded={isMenuOpen}
                aria-haspopup="listbox"
              >
                {currentFilterLabel}
                <svg className={styles.chevron} width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" />
                </svg>
              </button>

              {isMenuOpen && (
                <ul className={styles.filterMenu} role="listbox">
                  {FILTERS.map((opt, i) => (
                    <li key={opt.value}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={filter === opt.value}
                        className={`${styles.filterOption} ${filter === opt.value ? styles.activeOption : ""}`}
                        style={{ "--i": i }}
                        onClick={() => { setFilter(opt.value); setIsMenuOpen(false); }}
                      >
                        {opt.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* תפריט מיון (כמו 'כל המוצרים') */}
            <div className={styles.filterBar} ref={sortPickerRef}>
              <button
                type="button"
                className={styles.filterTrigger}
                onClick={() => setIsSortOpen((v) => !v)}
                aria-expanded={isSortOpen}
                aria-haspopup="listbox"
                title="שנה מיון"
              >
                {currentSortLabel || "בחר מיון"}
                <svg className={styles.chevron} width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" />
                </svg>
              </button>

              {isSortOpen && (
                <ul className={styles.filterMenu} role="listbox">
                  {SORT_OPTIONS.map((opt, i) => (
                    <li key={opt.value}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={sortBy === opt.value}
                        className={`${styles.filterOption} ${sortBy === opt.value ? styles.activeOption : ""}`}
                        style={{ "--i": i }}
                        onClick={() => { setSortBy(opt.value); setIsSortOpen(false); }}
                      >
                        {opt.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* סרגל כלים ממורכז – חיפוש + ספירה + ייצוא */}
          <div className={styles.toolbar}>
            <div className={styles.toolbarRow}>
              <input
                type="text"
                placeholder="חפש לפי שם מוצר / קטגוריה / מזהה…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
                aria-label="חיפוש מוצרים"
              />

              <span className={styles.countBadge} title="כמות מוצרים נוכחית">
                כמות המוצרים: {filteredProducts.length.toLocaleString("he-IL")}
              </span>

              <button onClick={exportToExcel} className={styles.exportBtn}>
                📤 ייצוא לאקסל
              </button>
            </div>
          </div>
        </div>
      </div>

      <section className={styles.productsSection}>
        {filteredProducts.length === 0 ? (
          <p className={styles.empty}>לא נמצאו מוצרים תואמים.</p>
        ) : (
          <div className={styles.grid}>
            {filteredProducts.map((p) => (
              <div className={styles.gridItem} key={p.product_id || p.id}>
                <SellerCard
                  item={{ ...p, product_status: p.status || p.product_status }}
                  onOpenDetails={() => setSelectedProduct(p)}
                  onOpenProduct={() => navigate(`/product/${p.product_id}`)}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {selectedProduct && (
        <ProductDetailsModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}
