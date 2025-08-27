// src/pages/adminProducts/AdminProductsPage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import ProductCardUnified from "../../components/ProductCardUnified/ProductCardUnified.jsx";
import styles from "./AdminProductsPage.module.css";
import { useNavigate } from "react-router-dom";
import { getSellerProducts } from "../../services/ManagementApi.js";
import { exportProductsToExcel } from "../../utils/exportProductsToExcel.jsx";

const FILTERS = [
  { value: "all",     label: "כל המוצרים" },
  { value: "sold",    label: "נמכרו" },
  { value: "toShip",  label: "מיועדים לשליחה" },
  { value: "sent",    label: "נשלחו/נמסרו" },
  { value: "pending", label: "טרם התחיל" },
  { value: "unsold",  label: "לא נמכרו" },
  { value: "blocked", label: "חסומים" },
];
//דף ניהול מוצרים של כל המוכרים של המנהל
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
    const onDoc = (e) => { if (pickerRef.current && !pickerRef.current.contains(e.target)) setIsMenuOpen(false); };
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
    return rows.filter((p) =>
      (p.product_name || "").toLowerCase().includes(s) ||
      (p.seller_name || "").toLowerCase().includes(s) ||
      (p.category_name || "").toLowerCase().includes(s) ||
      (p.subcategory_name || "").toLowerCase().includes(s) ||
      String(p.seller_id_number || "").toLowerCase().includes(s)
    );
  }, [rows, q]);

  function exportToExcel() {
    const currentFilterLabel = FILTERS.find(f => f.value === filter)?.label || "";
    exportProductsToExcel(filtered, { viewer: "admin", filterLabel: currentFilterLabel });
  }

  const currentFilterLabel = FILTERS.find(f => f.value === filter)?.label || "";

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.heroText}>
          <h1>ניהול כל המוצרים (מנהל)</h1>
          <p className={styles.subText}>צפייה בכל המוצרים של כל המוכרים</p>

          <div className={styles.filterBar} ref={pickerRef}>
            <button
              type="button"
              className={styles.filterTrigger}
              onClick={() => setIsMenuOpen(v => !v)}
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

          <div className={styles.searchContainer} style={{ marginTop: 12 }}>
            <input
              type="text"
              placeholder="חפש לפי שם מוצר או שם מוכר…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <div style={{ marginTop: 12 }}>
            <button onClick={exportToExcel} className={styles.exportBtn}>📤 ייצא לאקסל</button>
          </div>
        </div>
      </div>

      <section className={styles.productsSection}>
        {filtered.length === 0 ? (
          <p className={styles.empty}>לא נמצאו מוצרים תואמים.</p>
        ) : (
          <div className={styles.grid}>
            {filtered.map((p) => (
              <div className={styles.gridItem} key={p.product_id}>
                <ProductCardUnified
                  viewer="admin"
                  product={{ ...p, status: p.status || p.product_status }}
                  onOpenDetails={(prod) => navigate(`/product/${prod.product_id}`)}
                  // ❌ לא מעבירים onDelete => כפתור מחיקה לא יוצג
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
