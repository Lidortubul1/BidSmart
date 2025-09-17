// src/pages/AdminProducts/AdminProductsPage.jsx
// ניהול מוצרים (מנהל) — סינון ומיון כמו בדף מוכר ספציפי, עם פולינג שקט ורענון ידני

import { useEffect, useMemo, useRef, useState } from "react";
import ProductCardUnified from "../../components/ProductCardUnified/ProductCardUnified.jsx";
import styles from "./AdminProductsPage.module.css";
import { useNavigate } from "react-router-dom";
import { getSellerProducts } from "../../services/ManagementApi.js";
import { exportProductsToExcel } from "../../utils/exportProductsToExcel.jsx";

// סטטוסים — זהים לשמות והמיפוי בדף המוכר הספציפי
const FILTERS = [
  { value: "all",               label: "כל המוצרים" },

  // שלב המכירה
  { value: "forSale",           label: "זמין למכירה (ללא זוכה)" },   // for_sale + ללא זוכה
  { value: "pendingPayment",    label: "נמכרו – טרם שולם" },          // for_sale + יש זוכה (לא לכלול not_sold)

  // נמכר
  { value: "sold",              label: "נמכרו" },                     // sale
  { value: "soldDelivery",      label: "נמכרו – משלוח" },             // sale + delivery + כתובת
  { value: "soldPickup",        label: "נמכרו – איסוף עצמי" },        // sale + pickup

  // לא נמכר
  { value: "notSold",           label: "לא נמכרו" },                  // not_sold
  { value: "notSoldWithWinner", label: "מוצרים שיש זוכה אך לא שילם" }, // not_sold + יש זוכה

  // חסומים
  { value: "blocked",           label: "מוצרים שנחסמו על ידי המוכר" },  // blocked
  { value: "adminBlocked",      label: "מוצרים חסומים על ידי ההנהלה" }, // admin blocked
];

export default function AdminProductsPage() {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const pickerRef = useRef(null);
  const navigate = useNavigate();

  // עוזרים — זהים לדף המוכר הספציפי
  const canon = (x) =>
    String(x || "").trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  const isNonEmpty = (v) => !!String(v ?? "").trim();

  // --- טעינה ראשונית: תמיד מביאים "all" מהשרת (סינון בצד לקוח) ---
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const data = await getSellerProducts("all");
        if (!alive) return;
        setRows(Array.isArray(data) ? data : []);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // --- פולינג "שקט" ורענון כשחוזרים לטאב (ללא loading/פליקר) ---
  useEffect(() => {
    let alive = true;
    let timer;

    // משווה רק שדות רלוונטיים לתצוגה כדי למנוע רינדור מיותר
    const sameData = (a = [], b = []) => {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        const pa = a[i], pb = b[i];
        if (
          (pa.product_id ?? pa.id) !== (pb.product_id ?? pb.id) ||
          (pa.status || pa.product_status) !== (pb.status || pb.product_status) ||
          String(pa.winner_id_number ?? "") !== String(pb.winner_id_number ?? "") ||
          String(pa.delivery_method ?? pa.deliveryMethod ?? pa.delivery_method_name ?? "") !==
            String(pb.delivery_method ?? pb.deliveryMethod ?? pb.delivery_method_name ?? "") ||
          String(pa.city ?? "") !== String(pb.city ?? "") ||
          String(pa.house_number ?? pa.houseNumber ?? "") !== String(pb.house_number ?? pb.houseNumber ?? "") ||
          String(pa.apartment_number ?? pa.apartmentNumber ?? "") !== String(pb.apartment_number ?? pb.apartmentNumber ?? "")
        ) return false;
      }
      return true;
    };

    const fetchSilently = async () => {
      try {
        const fresh = await getSellerProducts("all");
        if (!alive) return;
        const next = Array.isArray(fresh) ? fresh : [];
        setRows(prev => (sameData(prev, next) ? prev : next));
      } catch { /* שקט */ }
    };

    timer = setInterval(() => {
      if (document.visibilityState === "visible") fetchSilently();
    }, 60_000);

    const onFocus = () => fetchSilently();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);

  // סגירת תפריט מסננים בלחיצה חיצונית/ESC
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

  // --- סינון לקוח כמו בדף המוכר הספציפי ---
  const filtered = useMemo(() => {
    let data = rows;

    if (filter && filter !== "all") {
      data = data.filter((p) => {
        const st = canon(p.status || p.product_status); // "for sale" | "sale" | "not sold" | ...
        const dm = canon(p.delivery_method || p.deliveryMethod || p.delivery_method_name);

        const city  = p.city;
        const house = p.house_number ?? p.houseNumber;
        const apt   = p.apartment_number ?? p.apartmentNumber;

        const hasWinner = !!String(p.winner_id_number ?? "").trim();

        const isAdminBlocked =
          st.includes("admin") && st.includes("block");
        const isBlockedGeneric =
          st === "blocked" ||
          st === "blockrd" || // תמיכה בכתיב שגוי
          (st.includes("block") && !isAdminBlocked);

        switch (filter) {
          case "forSale":
            // for_sale + ללא זוכה
            return (st === "for sale" || st === "for_sale") && !hasWinner;

          case "pendingPayment":
            // רק for_sale + יש זוכה (לא לכלול not_sold אף אם השרת כבר עדכן)
            return (
              (st === "for sale" || st === "for_sale") &&
              hasWinner &&
              st !== "not sold" && st !== "not_sold"
            );

          case "sold":
            return st === "sale";

          case "soldDelivery":
            return (
              st === "sale" &&
              (dm === "delivery" || dm === "משלוח") &&
              isNonEmpty(city) &&
              (isNonEmpty(house) || isNonEmpty(apt))
            );

          case "soldPickup":
            return st === "sale" && (dm === "pickup" || dm === "איסוף עצמי" || dm === "איסוף");

          case "notSold":
            return st === "not sold" || st === "not_sold";

          case "notSoldWithWinner":
            return (st === "not sold" || st === "not_sold") && hasWinner;

          case "adminBlocked":
            return isAdminBlocked;

          case "blocked":
            return isBlockedGeneric;

          default:
            return true;
        }
      });
    }

    // חיפוש טקסטואלי (כולל שדות מוכר/מזהים)
    const s = q.trim().toLowerCase();
    if (s) {
      data = data.filter(
        (p) =>
          (p.product_name || "").toLowerCase().includes(s) ||
          (p.seller_name || "").toLowerCase().includes(s) ||
          (p.category_name || "").toLowerCase().includes(s) ||
          (p.subcategory_name || "").toLowerCase().includes(s) ||
          String(p.seller_id_number || "").toLowerCase().includes(s) ||
          String(p.product_id || "").toLowerCase().includes(s)
      );
    }

    return data;
  }, [rows, filter, q]);

  function exportToExcel() {
    const currentFilterLabel = FILTERS.find((f) => f.value === filter)?.label || "";
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

          {/* בורר סטטוס */}
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

          {/* חיפוש */}
          <div className={styles.adminProductsSearchContainer} style={{ marginTop: 12 }}>
            <input
              type="text"
              placeholder="חפש לפי שם מוצר או שם מוכר…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className={styles.adminProductsSearchInput}
            />
          </div>

          {/* פעולות */}
          <div>
            <button onClick={exportToExcel} className={styles.adminProductsExportBtn}>
              📤 ייצא לאקסל
            </button>
            {/* כפתור רענון ידני (נשאר גלוי) */}
            <button
              onClick={async () => {
                setLoading(true);
                try {
                  const data = await getSellerProducts("all");
                  setRows(Array.isArray(data) ? data : []);
                } finally {
                  setLoading(false);
                }
              }}
              className={styles.adminProductsExportBtn}
              title="רענון נתונים"
            >
              🔄 רענון
            </button>
          </div>
        </div>
      </div>

      {/* גוף הדף */}
      {loading ? (
        <section className={styles.adminProductsProductsSection}>
          <p className={styles.adminProductsEmpty}>טוען…</p>
        </section>
      ) : filtered.length === 0 ? (
        <section className={styles.adminProductsProductsSection}>
          <p className={styles.adminProductsEmpty}>לא נמצאו מוצרים תואמים.</p>
        </section>
      ) : (
        <section className={styles.adminProductsProductsSection}>
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
        </section>
      )}
    </div>
  );
}
