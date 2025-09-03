// pages/manageProducts/ManageProductsPage.jsx
import { useState, useEffect, useRef } from "react";
import styles from "./ManageProductsPage.module.css";
import ProductCardUnified from "../../components/ProductCardUnified/ProductCardUnified"
import ProductDetailsModal from "../../components/ProductDetailsModal/ProductDetailsModal";
import { getSellerProducts } from "../../services/ManagementApi.js";
import { exportProductsToExcel } from "../../utils/exportProductsToExcel.jsx"

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


export default function ManageProductsPage() {
  const [products, setProducts] = useState([]);
  const [filter, setFilter] = useState("all");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const pickerRef = useRef(null);

  useEffect(() => {
    async function fetchProducts() {
      const data = await getSellerProducts(filter);
      setProducts(Array.isArray(data) ? data : []);
    }
    fetchProducts();
  }, [filter]);

  useEffect(() => {
    function onDocClick(e) {
      if (!pickerRef.current) return;
      if (!pickerRef.current.contains(e.target)) setIsMenuOpen(false);
    }
    function onEsc(e) {
      if (e.key === "Escape") setIsMenuOpen(false);
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  const filteredProducts = products.filter((p) =>
    (p.product_name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentFilterLabel = FILTERS.find(f => f.value === filter)?.label || "";
function exportToExcel() {
  const label = FILTERS.find(f => f.value === filter)?.label || "";
  exportProductsToExcel(filteredProducts, { viewer: "seller", filterLabel: label });
}
  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.heroText}>
          <h1>ניהול המוצרים שלי</h1>
          <p className={styles.subText}>לעריכת פרטי מוצר שטרם נרכש נא לחץ עליו</p>

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
                    <div style={{ margin: "8px 0 16px" }}>
  <button onClick={exportToExcel} className={styles.exportBtn}>📤 ייצא לאקסל</button>
</div>
        </div>
      </div>

      <section className={styles.productsSection}>
  <div className={styles.searchContainer}>
  <input
    type="text"
    placeholder="חפש מוצר לפי שם..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    className={styles.searchInput}
  />
</div>



        {filteredProducts.length === 0 ? (
          <p className={styles.empty}>לא נמצאו מוצרים תואמים.</p>
        ) : (
          <div className={styles.grid}>
            {filteredProducts.map((p) => (
              <div className={styles.gridItem} key={p.product_id || p.id}>
  <ProductCardUnified
  viewer="seller"
  product={{ ...p, status: p.status || p.product_status }}
  onOpenDetails={(prod) => setSelectedProduct(prod)}
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
