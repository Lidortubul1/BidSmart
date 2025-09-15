// ניהול מוצרים (מנהל) — עיצוב בלבד (שמות מחלקות ייחודיים), ללא שינוי לוגי
import { useEffect, useMemo, useRef, useState } from "react";
import ProductCardUnified from "../../components/ProductCardUnified/ProductCardUnified.jsx";
import styles from "./AdminProductsPage.module.css";
import { useNavigate } from "react-router-dom";
import { getSellerProducts } from "../../services/ManagementApi.js";
import { exportProductsToExcel } from "../../utils/exportProductsToExcel.jsx";

// התאמת הסטטוסים לדף המוכר (ManageProductsPage)
const FILTERS = [
  { value: "all",          label: "כל המוצרים" },
  { value: "forSale",      label: "מוצרים שטרם חלה המכירה" },  // status = for_sale
  { value: "sold",         label: "כל המוצרים שנמכרו" },       // status = sale
  { value: "soldDelivery", label: "נמכרו - משלוח" },           // status = sale + delivery
  { value: "soldPickup",   label: "נמכרו - איסוף עצמי" },      // status = sale + pickup
  { value: "notSold",      label: "מוצרים שלא נמכרו" },        // status = Not sold
  { value: "blocked",      label: "מוצרים שנחסמו על ידי המוכר" },     // status = blocked
  { value: "adminBlocked", label: "מוצרים חסומים על ידי ההנהלה" } // status = admin blocked
];

export default function AdminProductsPage() {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pickerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const data = await getSellerProducts(filter);
      setRows(Array.isArray(data) ? data : []);
    })();
  }, [filter]);

  useEffect(() => {
    const onDoc = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target))
        setIsMenuOpen(false);
    };
    const onEsc = (e) => e.key === "Escape" && setIsMenuOpen(false);
    document.addEventListener("click", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("click", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(
      (p) =>
        (p.product_name || "").toLowerCase().includes(s) ||
        (p.seller_name || "").toLowerCase().includes(s) ||
        (p.category_name || "").toLowerCase().includes(s) ||
        (p.subcategory_name || "").toLowerCase().includes(s) ||
        String(p.seller_id_number || "").toLowerCase().includes(s)
    );
  }, [rows, q]);

  function exportToExcel() {
    const currentFilterLabel =
      FILTERS.find((f) => f.value === filter)?.label || "";
    exportProductsToExcel(filtered, {
      viewer: "admin",
      filterLabel: currentFilterLabel,
    });
  }

  const currentFilterLabel =
    FILTERS.find((f) => f.value === filter)?.label || "";

  return (
    <div className={styles.adminProductsPage}>
      <div className={styles.adminProductsHero}>
        <div className={styles.adminProductsHeroText}>
          <h1>ניהול כל המוצרים (מנהל)</h1>
          <p className={styles.adminProductsSubText}>צפייה בכל המוצרים של כל המוכרים</p>

          <div className={styles.adminProductsFilterBar} ref={pickerRef}>
            <button
              type="button"
              className={styles.adminProductsFilterTrigger}
              onClick={() => setIsMenuOpen((v) => !v)}
              aria-expanded={isMenuOpen}
              aria-haspopup="listbox"
            >
              {currentFilterLabel}
              <svg
                className={styles.adminProductsChevron}
                width="18"
                height="18"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            </button>

            {isMenuOpen && (
              <ul className={styles.adminProductsFilterMenu} role="listbox">
                {FILTERS.map((opt, i) => (
                  <li key={opt.value}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={filter === opt.value}
                      className={`${styles.adminProductsFilterOption} ${
                        filter === opt.value ? styles.adminProductsActiveOption : ""
                      }`}
                      style={{ "--i": i }}
                      onClick={() => {
                        setFilter(opt.value);
                        setIsMenuOpen(false);
                      }}
                    >
                      {opt.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={styles.adminProductsSearchContainer} style={{ marginTop: 12 }}>
            <input
              type="text"
              placeholder="חפש לפי שם מוצר או שם מוכר…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className={styles.adminProductsSearchInput}
            />
          </div>

          <div style={{ marginTop: 12 }}>
            <button onClick={exportToExcel} className={styles.adminProductsExportBtn}>
              📤 ייצא לאקסל
            </button>
          </div>
        </div>
      </div>

      <section className={styles.adminProductsProductsSection}>
        {filtered.length === 0 ? (
          <p className={styles.adminProductsEmpty}>לא נמצאו מוצרים תואמים.</p>
        ) : (
          <div className={styles.adminProductsGrid}>
            {filtered.map((p) => (
              <div className={styles.adminProductsGridItem} key={p.product_id}>
                <ProductCardUnified
                  viewer="admin"
                  product={{ ...p, status: p.status || p.product_status }}
                  onOpenDetails={(prod) => navigate(`/product/${prod.product_id}`)}
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
