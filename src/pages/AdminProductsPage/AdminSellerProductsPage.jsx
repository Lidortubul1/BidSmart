// src/pages/AdminProducts/AdminSellerProductsPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import ProductCardUnified from "../../components/ProductCardUnified/ProductCardUnified.jsx";
import styles from "./AdminProductsPage.module.css";
import { getProductsBySellerIdNumber } from "../../services/adminApi";

const STATUS_OPTIONS = [
  { key: "", label: "כל הסטטוסים" },
  { key: "sale", label: "נמכר" },
  { key: "for sale", label: "זמין למכירה" },
  { key: "not sold", label: "לא נמכר" },
  { key: "blocked", label: "נחסם" },
];
// דף ניהול מוצרים של מוכר ספציפי
export default function AdminSellerProductsPage() {
  const params = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();

  const sellerIdFromRoute = params?.sellerIdNumber;
  const sellerIdFromState = state?.sellerIdNumber || state?.seller?.id_number;
  const sellerName = state?.sellerName || "";
  const sellerId = sellerIdFromRoute || sellerIdFromState || "";

  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");     // סינון סטטוס
  const [sortBy, setSortBy] = useState("start_desc"); // start_desc | price_desc | price_asc | id_desc | id_asc
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sellerId) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      try {
        const data = await getProductsBySellerIdNumber(sellerId);
        setRows(Array.isArray(data) ? data : []);
      } finally {
        setLoading(false);
      }
    })();
  }, [sellerId]);

  const filtered = useMemo(() => {
    let data = rows;

    // חיפוש
    const s = q.trim().toLowerCase();
    if (s) {
      data = data.filter((p) =>
        (p.product_name || "").toLowerCase().includes(s) ||
        (p.category_name || "").toLowerCase().includes(s) ||
        (p.subcategory_name || "").toLowerCase().includes(s) ||
        String(p.product_id || "").includes(s)
      );
    }

    // סינון סטטוס
    if (status) {
      const canon = (x) => String(x || "").toLowerCase();
      data = data.filter((p) => {
        const st = canon(p.status || p.product_status);
        return st === status;
      });
    }

    // מיון
    const by = (a, b) => {
      const sa = new Date(a.start_date || 0).getTime();
      const sb = new Date(b.start_date || 0).getTime();
      const pa = Number(a.current_price || 0);
      const pb = Number(b.current_price || 0);
      const ia = Number(a.product_id || 0);
      const ib = Number(b.product_id || 0);

      switch (sortBy) {
        case "start_desc": return sb - sa;
        case "price_desc": return pb - pa;
        case "price_asc":  return pa - pb;
        case "id_desc":    return ib - ia;
        case "id_asc":     return ia - ib;
        default:           return sb - sa;
      }
    };
    return [...data].sort(by);
  }, [rows, q, status, sortBy]);

  return (
    <div className={styles.page}>
      {/* כותרת עליונה/Hero */}
      <header className={styles.hero}>
        <div className={styles.heroText}>
          <h1>מוצרים של המוכר</h1>
          <p className={styles.subText}>
            {sellerName
              ? `${sellerName} • ת״ז ${sellerId || "לא ידוע"}`
              : `ת״ז ${sellerId || "לא ידוע"}`}
          </p>

          <div className={styles.toolbar}>
            <div className={styles.toolbarRow}>
              <input
                type="text"
                placeholder="חפש לפי שם מוצר / קטגוריה…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className={styles.searchInput}
              />

              <select
                className={styles.select}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                title="סינון לפי סטטוס"
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.key} value={opt.key}>{opt.label}</option>
                ))}
              </select>

              <select
                className={styles.select}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                title="מיון"
              >
                <option value="start_desc">מועד התחלה (חדש→ישן)</option>
                <option value="price_desc">מחיר נוכחי (גבוה→נמוך)</option>
                <option value="price_asc">מחיר נוכחי (נמוך→גבוה)</option>
                <option value="id_desc">מזהה מוצר (גבוה→נמוך)</option>
                <option value="id_asc">מזהה מוצר (נמוך→גבוה)</option>
              </select>

              <span className={styles.countBadge} title="כמות מוצרים נוכחית">
                {filtered.length.toLocaleString("he-IL")} מוצרים
              </span>

              <button className={styles.backBtn} onClick={() => window.history.back()}>
                ⬅ חזרה
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* גוף הדף */}
      {loading ? (
        <section className={styles.productsSection}>
          <p className={styles.empty}>טוען…</p>
        </section>
      ) : !sellerId ? (
        <section className={styles.productsSection}>
          <p className={styles.empty}>לא נמצא מזהה מוכר. נסי לחזור וללחוץ שוב על "פתח דף פריטי המוכר".</p>
        </section>
      ) : (
        <section className={styles.productsSection}>
          {filtered.length === 0 ? (
            <p className={styles.empty}>לא נמצאו מוצרים למוכר זה.</p>
          ) : (
            <div className={styles.grid}>
              {filtered.map((p) => (
                <div className={styles.gridItem} key={p.product_id}>
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
      )}
    </div>
  );
}
