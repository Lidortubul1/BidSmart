// src/pages/AdminProducts/AdminSellerProductsPage.jsx
// דף מוצרים של מוכר ספציפי — מעוצב כמו דפי הניהול/המוכר:
// - Hero שקוף עם כתמי אור
// - Dropdown מותאם לסטטוס + Dropdown למיון
// - סרגל חיפוש + באדג' ספירה + ייצוא לאקסל
// - גריד בגובה כרטיס אחיד

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import styles from "./AdminProductsPage.module.css";
import ProductCardUnified from "../../components/ProductCardUnified/ProductCardUnified.jsx";
import { getProductsBySellerIdNumber } from "../../services/adminApi";
import { exportProductsToExcel } from "../../utils/exportProductsToExcel.jsx";

const STATUS_OPTIONS = [
  { key: "",               label: "כל הסטטוסים" },
  { key: "for_sale",       label: "זמין למכירה" },
  { key: "sale",           label: "נמכר" },
  { key: "sale_delivery",  label: "נמכר – משלוח" },
  { key: "sale_pickup",    label: "נמכר – איסוף עצמי" },
  { key: "not_sold",       label: "לא נמכר" },
  { key: "blocked",        label: "נחסם" },
  { key: "admin_blocked",  label: "נחסם ע״י ההנהלה" },
];

const SORT_OPTIONS = [
  { value: "start_desc", label: "מועד התחלה (חדש→ישן)" },
  { value: "price_desc", label: "מחיר נוכחי (גבוה→נמוך)" },
  { value: "price_asc",  label: "מחיר נוכחי (נמוך→גבוה)" },
  { value: "id_desc",    label: "מזהה מוצר (גבוה→נמוך)" },
  { value: "id_asc",     label: "מזהה מוצר (נמוך→גבוה)" },
];

export default function AdminSellerProductsPage() {
  const { sellerIdNumber: sellerIdFromRoute } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();

  const sellerIdFromState = state?.sellerIdNumber || state?.seller?.id_number;
  const sellerName = state?.sellerName || "";
  const sellerId = sellerIdFromRoute || sellerIdFromState || "";

  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [sortBy, setSortBy] = useState("start_desc");
  const [loading, setLoading] = useState(true);

  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const statusRef = useRef(null);
  const sortRef = useRef(null);

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

  useEffect(() => {
    function onDocClick(e) {
      if (statusRef.current && !statusRef.current.contains(e.target)) setIsStatusOpen(false);
      if (sortRef.current && !sortRef.current.contains(e.target)) setIsSortOpen(false);
    }
    function onEsc(e) {
      if (e.key === "Escape") { setIsStatusOpen(false); setIsSortOpen(false); }
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  const canon = (x) =>
    String(x || "").trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");

  const filtered = useMemo(() => {
    let data = rows;

    const s = q.trim().toLowerCase();
    if (s) {
      data = data.filter((p) =>
        (p.product_name || "").toLowerCase().includes(s) ||
        (p.category_name || "").toLowerCase().includes(s) ||
        (p.subcategory_name || "").toLowerCase().includes(s) ||
        String(p.product_id || "").includes(s)
      );
    }

    if (status) {
      data = data.filter((p) => {
        const st = canon(p.status || p.product_status);
        const dm = canon(p.delivery_method || p.deliveryMethod || p.delivery_method_name);
        const isBlockedByAdmin = st.includes("admin") && st.includes("block");
        const isBlockedGeneric = st === "blocked" || (st.includes("block") && !isBlockedByAdmin);

        switch (status) {
          case "for_sale":       return st === "for sale" || st === "for_sale";
          case "sale":           return st === "sale";
          case "sale_delivery":  return st === "sale" && (dm === "delivery" || dm === "משלוח");
          case "sale_pickup":    return st === "sale" && (dm === "pickup" || dm === "איסוף עצמי" || dm === "איסוף");
          case "not_sold":       return st === "not sold" || st === "not_sold";
          case "admin_blocked":  return isBlockedByAdmin;
          case "blocked":        return isBlockedGeneric || st === "blocked";
          default:               return true;
        }
      });
    }

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

  const currentStatusLabel = (STATUS_OPTIONS.find(o => o.key === status)?.label) || "כל הסטטוסים";
  const currentSortLabel   = (SORT_OPTIONS.find(o => o.value === sortBy)?.label) || "בחר מיון";

  function exportToExcel() {
    exportProductsToExcel(filtered, {
      viewer: "admin",
      filterLabel: `מוכר: ${sellerName || sellerId || "לא ידוע"} • סטטוס: ${currentStatusLabel} • מיון: ${currentSortLabel}`,
    });
  }

  return (
    <div className={styles.adminProductsPage}>
      {/* Hero */}
      <header className={styles.adminProductsHero}>
        <div className={styles.adminProductsHeroText}>
          <h1>מוצרים של המוכר</h1>
          <p className={styles.adminProductsSubText}>
            {sellerName
              ? `${sellerName} • ת״ז ${sellerId || "לא ידוע"}`
              : `ת״ז ${sellerId || "לא ידוע"}`}
          </p>

          {/* Controls Row: סטטוס + מיון + חיפוש + ספירה + ייצוא + חזרה */}
  {/* שורת בקרים ממורכזת: סטטוס + מיון + חיפוש/ספירה + פעולות */}
<div className={styles.adminProductsToolbar}>
  <div className={styles.adminProductsToolbarCol}>
    {/* שורה 1: סטטוס + מיון */}
    <div className={styles.adminProductsControlsRow}>
      {/* Dropdown סטטוס */}
      <div className={styles.adminProductsFilterBar} ref={statusRef}>
        <button
          type="button"
          className={styles.adminProductsFilterTrigger}
          onClick={() => setIsStatusOpen(v => !v)}
          aria-expanded={isStatusOpen}
          aria-haspopup="listbox"
          title="סינון לפי סטטוס"
        >
          {currentStatusLabel}
          <svg className={styles.adminProductsChevron} width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>

        {isStatusOpen && (
          <ul className={styles.adminProductsFilterMenu} role="listbox">
            {STATUS_OPTIONS.map((opt, i) => (
              <li key={opt.key}>
                <button
                  type="button"
                  role="option"
                  aria-selected={status === opt.key}
                  className={`${styles.adminProductsFilterOption} ${status === opt.key ? styles.adminProductsActiveOption : ""}`}
                  style={{ "--i": i }}
                  onClick={() => { setStatus(opt.key); setIsStatusOpen(false); }}
                >
                  {opt.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Dropdown מיון */}
      <div className={styles.adminProductsFilterBar} ref={sortRef}>
        <button
          type="button"
          className={styles.adminProductsFilterTrigger}
          onClick={() => setIsSortOpen(v => !v)}
          aria-expanded={isSortOpen}
          aria-haspopup="listbox"
          title="שנה מיון"
        >
          {currentSortLabel}
          <svg className={styles.adminProductsChevron} width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>

        {isSortOpen && (
          <ul className={styles.adminProductsFilterMenu} role="listbox">
            {SORT_OPTIONS.map((opt, i) => (
              <li key={opt.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={sortBy === opt.value}
                  className={`${styles.adminProductsFilterOption} ${sortBy === opt.value ? styles.adminProductsActiveOption : ""}`}
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

    {/* שורה 2: חיפוש + "23 מוצרים" */}
    <div className={styles.adminProductsSearchRow}>
      <input
        type="text"
        placeholder="חפש לפי שם מוצר / קטגוריה / מזהה…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className={styles.adminProductsSearchInput}
        aria-label="חיפוש מוצרים"
      />
      <span className={styles.adminProductsCountBadge} title="כמות מוצרים נוכחית">
        {filtered.length.toLocaleString("he-IL")} מוצרים
      </span>
    </div>

    {/* שורה 3: פעולות (ייצוא / חזרה) */}
    <div className={styles.adminProductsActionsRow}>
      <button onClick={exportToExcel} className={styles.adminProductsExportBtn}>
        📤 ייצוא לאקסל
      </button>
      <button className={styles.adminProductsBackBtn} onClick={() => window.history.back()}>
        ⬅ חזרה
      </button>
    </div>
  </div>
</div>

        </div>
      </header>

      {/* גוף הדף */}
      {loading ? (
        <section className={styles.adminProductsProductsSection}>
          <p className={styles.adminProductsEmpty}>טוען…</p>
        </section>
      ) : !sellerId ? (
        <section className={styles.adminProductsProductsSection}>
          <p className={styles.adminProductsEmpty}>
            לא נמצא מזהה מוכר. נסי לחזור וללחוץ שוב על "פתח דף פריטי המוכר".
          </p>
        </section>
      ) : (
        <section className={styles.adminProductsProductsSection}>
          {filtered.length === 0 ? (
            <p className={styles.adminProductsEmpty}>לא נמצאו מוצרים למוכר זה.</p>
          ) : (
            <div className={styles.adminProductsGrid}>
              {filtered.map((p) => (
                <div className={styles.adminProductsGridItem} key={p.product_id}>
                 <ProductCardUnified
  viewer="admin"
  product={{
    ...p,
    product_id: p.product_id ?? p.id, // גיבוי לניווט/טעינת נרשמים
    status: p.status || p.product_status,
    // נרמול מחיר פתיחה כדי שלא נתבסס רק על שם שדה אחד
    price:
      p.price ??
      p.opening_price ?? p.openingPrice ??
      p.start_price   ?? p.starting_price ?? p.startPrice ??
      p.initial_price ?? p.initialPrice ??
      p.base_price    ?? p.basePrice ??
      p.starting_bid  ?? p.minimum_price  ?? p.min_price,
    // (אופציונלי) גם למחיר נוכחי/סופי
    current_price: p.current_price ?? p.final_price
  }}
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
