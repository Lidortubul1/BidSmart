import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import ProductCardUnified from "../../components/ProductCardUnified/ProductCardUnified.jsx";
import styles from "./AdminProductsPage.module.css";
import { getProductsBySellerIdNumber } from "../../services/adminApi";

export default function AdminSellerProductsPage() {
  const params = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();

  // פרמטר מהנתיב אם יש
  const sellerIdFromRoute = params?.sellerIdNumber;
  // גיבוי מה-state שמועבר מכפתור בדף פרטי המשתמש
  const sellerIdFromState = state?.sellerIdNumber || state?.seller?.id_number;

  // מזהה אחד מאוחד לשימוש בכל הקומפוננטה
  const sellerId = sellerIdFromRoute || sellerIdFromState || "";

  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sellerId) { setLoading(false); return; } // אין מזהה — לא נטען
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

  console.log("Current seller ID:", sellerId);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((p) =>
      (p.product_name || "").toLowerCase().includes(s) ||
      (p.category_name || "").toLowerCase().includes(s) ||
      (p.subcategory_name || "").toLowerCase().includes(s) ||
      String(p.product_id || "").includes(s)
    );
  }, [rows, q]);

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.heroText}>
          <h1>מוצרים של המוכר</h1>
          <p className={styles.subText}>
            {state?.sellerName
              ? `${state.sellerName} • ת״ז ${sellerId || "לא ידוע"}`
              : `ת״ז ${sellerId || "לא ידוע"}`}
          </p>

          <div className={styles.searchContainer} style={{ marginTop: 12 }}>
            <input
              type="text"
              placeholder="חפש לפי שם מוצר / קטגוריה…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <div style={{ marginTop: 12 }}>
            <button className={styles.exportBtn} onClick={() => window.history.back()}>
              ⬅ חזרה
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <section className={styles.productsSection}><p className={styles.empty}>טוען…</p></section>
      ) : !sellerId ? (
        <section className={styles.productsSection}>
          <p className={styles.empty}>לא נמצא מזהה מוכר. נסי לחזור וללחוץ שוב על "צפייה בפריטי המוכר".</p>
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
