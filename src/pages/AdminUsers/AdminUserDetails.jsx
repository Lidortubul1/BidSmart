import { useEffect, useMemo, useState } from "react";              // Hooks לניהול state ולוגיקת טעינה
import {
  getUserById,
  getProductsBySellerIdNumber,                                      // ← חדש: שליפת מוצרי המוכר
} from "../../services/adminApi";                                   // קריאות API
import ProductCardUnified from "../../components/ProductCardUnified/ProductCardUnified.jsx"; // ← חדש: כרטיס מוצר מאוחד
import styles from "./AdminUsers.module.css";                        // מודול CSS לעיצוב כרטיס פרטי המשתמש
import { useNavigate } from "react-router-dom";                      // ניווט לעמוד פרטי מוצר
import AdminSellerProductsPage from "../AdminProductsPage/AdminSellerProductsPage.jsx"

/**
 * AdminUserDetails
 * כרטיס פרטים מפורט למשתמש בודד, מוצג בתוך טבלת הניהול מתחת לשורה.
 *
 * props:
 *  - userId: number (חובה)       → מזהה פנימי של המשתמש בטבלת users (עמודת id)
 *  - onClose?: () => void         → פעולה לסגירת הכרטיס (כפתור "סגור" בראש הכרטיס)
 */

//כרטיס של כל משתמש (ניהול משתמשים מנהל)
export default function AdminUserDetails({ userId, onClose }) {
  // אובייקט המשתמש שנטען מהשרת (או null עד לטעינה)
  const [user, setUser] = useState(null);

  // דגלי מצב מסך: טעינה ושגיאה
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // --- חדש: מצב להצגת/הסתרת מוצרי המוכר + נתוני המוצרים ---
  const [showSellerProducts, setShowSellerProducts] = useState(false); // האם להציג את רשימת המוצרים
  const [sellerProducts, setSellerProducts] = useState([]);            // כל מוצרי המוכר
  const [productsLoading, setProductsLoading] = useState(false);       // טעינת המוצרים
  const [productsQuery, setProductsQuery] = useState("");              // חיפוש בתוך מוצרי המוכר

  // הוק ניווט – לשימוש בכפתור "צפייה בפרטי מוצר"
  const navigate = useNavigate();

  // אפקט טעינה: נטען פרטי משתמש בכל פעם ש־userId משתנה
  useEffect(() => {
    (async () => {
      setLoading(true);           // תחילת טעינה
      setError("");               // איפוס הודעת שגיאה קודמת
      try {
        const data = await getUserById(userId); // בקשת API לשרת
        setUser(data || null);                  // שמירת תוצאה (או null אם לא חזר כלום)
      } catch (e) {
        console.error(e);
        setError("שגיאה בטעינת פרטי המשתמש"); // הודעת שגיאה ידידותית למסך
      } finally {
        setLoading(false);        // סיום טעינה (בהצלחה/בשגיאה)
      }
    })();
  }, [userId]);

  // טעינת מוצרי מוכר – מופעלת כשמשנים ל-"הצג", ורק אם יש role=t seller + ת״ז
  useEffect(() => {
    if (!showSellerProducts) return;                    // לא נדרש לטעון אם מוסתר
    if (!user || user.role !== "seller" || !user.id_number) return;

    (async () => {
      setProductsLoading(true);
      try {
        const list = await getProductsBySellerIdNumber(user.id_number);
        setSellerProducts(Array.isArray(list) ? list : []);
      } finally {
        setProductsLoading(false);
      }
    })();
  }, [showSellerProducts, user]);

  // סינון מוצרים ע"פ חיפוש טקסטואלי
  const filteredProducts = useMemo(() => {
    const s = productsQuery.trim().toLowerCase();
    if (!s) return sellerProducts;
    return sellerProducts.filter((p) =>
      (p.product_name || "").toLowerCase().includes(s) ||
      (p.category_name || "").toLowerCase().includes(s) ||
      (p.subcategory_name || "").toLowerCase().includes(s) ||
      String(p.product_id || "").includes(s)
    );
  }, [sellerProducts, productsQuery]);

  return (
    <div className={styles.auDetails_wrap}>
      {/* כותרת הכרטיס + כפתור סגירה אופציונלי */}
      <div className={styles.auDetails_header}>
        <h3 className={styles.au_title}>פרטי משתמש</h3>

        {/* כפתור "סגור" מוצג רק אם onClose התקבל בפרופס */}
        {onClose && (
          <button className={styles.au_btn} onClick={onClose}>
            סגור
          </button>
        )}
      </div>

      {/* מצבי ביניים/שגיאה */}
      {loading && <div className={styles.au_state}>טוען…</div>}
      {error && <div className={styles.au_error}>{error}</div>}

      {/* תוכן הכרטיס – מוצג רק אם אין טעינה/שגיאה ויש אובייקט משתמש */}
      {!loading && !error && user && (
        <div className={styles.au_grid}>
          {/* כרטיס: פרטים בסיסיים */}
          <div className={styles.au_card}>
            {/* כותרת משנה + כפתור מעבר להצגת פריטי המוכר (רק אם מדובר במוכר עם ת״ז) */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h4>פרטים בסיסיים</h4>

              {/* כפתור הצגה/הסתרה יוצג רק כש— role === "seller" ויש user.id_number */}

              {user.role === "seller" && user.id_number && (
                <button
                  className={styles.au_btn}
                  onClick={() =>
                    navigate(`/admin/sellers/${user.id_number}/products`, {
                      state: {
                        sellerName: [user.first_name, user.last_name].filter(Boolean).join(" "),
                        sellerIdNumber: user.id_number,
                      },
                    })
                  }
                  title="פתיחה כדף מלא של פריטי המוכר"
                >
                  פתח דף פריטי המוכר
                </button>
              )}

            </div>

            {/* זוגות שדה/ערך – מזהה פנימי, ת״ז, שם מלא, דוא״ל, טלפון, תפקיד, סטטוס, תאריך הרשמה */}
            <div className={styles.au_field}>
              <span>מזהה:</span>
              <b>{user.id}</b>
            </div>

            <div className={styles.au_field}>
              <span>ת״ז:</span>
              <b>{user.id_number || "-"}</b>
            </div>

            <div className={styles.au_field}>
              <span>שם:</span>
              <b>{[user.first_name, user.last_name].filter(Boolean).join(" ") || "-"}</b>
            </div>

            <div className={styles.au_field}>
              <span>דוא״ל:</span>
              <b>{user.email || "-"}</b>
            </div>

            <div className={styles.au_field}>
              <span>טלפון:</span>
              <b>{user.phone || "-"}</b>
            </div>

            <div className={styles.au_field}>
              <span>תפקיד:</span>
              <b>{user.role}</b>
            </div>

            <div className={styles.au_field}>
              <span>סטטוס:</span>
              <b>{user.status}</b>
            </div>

            <div className={styles.au_field}>
              <span>נרשם:</span>
              <b>{user.registered ? new Date(user.registered).toLocaleString("he-IL") : "-"}</b>
            </div>

            {/* דירוג יוצג רק אם המשתמש אינו buyer ויש מפתח rating באובייקט */}
            {user.role !== "buyer" && "rating" in user && (
              <div className={styles.au_field}>
                <span>דירוג:</span>
                <b>{user.rating ?? "-"}</b>
              </div>
            )}
          </div>

          {/* כרטיס: כתובת */}
          <div className={styles.au_card}>
            <h4>כתובת</h4>

            <div className={styles.au_field}>
              <span>מדינה:</span>
              <b>{user.country || "-"}</b>
            </div>

            <div className={styles.au_field}>
              <span>עיר:</span>
              <b>{user.city || "-"}</b>
            </div>

            <div className={styles.au_field}>
              <span>רחוב:</span>
              <b>{user.street || "-"}</b>
            </div>

            <div className={styles.au_field}>
              <span>מס׳ בית:</span>
              <b>{user.house_number || "-"}</b>
            </div>

            <div className={styles.au_field}>
              <span>דירה:</span>
              <b>{user.apartment_number || "-"}</b>
            </div>

            <div className={styles.au_field}>
              <span>מיקוד:</span>
              <b>{user.zip || "-"}</b>
            </div>
          </div>

          {/* כרטיס: תמונות מזהה/פרופיל */}
          <div className={styles.au_card}>
            <h4>תמונות</h4>

            <div className={styles.au_field}>
              <span>תמונת ת״ז:</span>
              <b>{user.id_card_photo ? "קיים" : "—"}</b>
            </div>

            <div className={styles.au_field}>
              <span>תמונת פרופיל:</span>
              <b>{user.profile_photo ? "קיים" : "—"}</b>
            </div>
          </div>

          {/* כרטיס: העדפות משלוח – מוצג רק אם המשתמש אינו buyer */}
          {user.role !== "buyer" && (
            <div className={styles.au_card}>
              <h4>העדפות משלוח</h4>
              <div className={styles.au_field}>
                <span>אפשרויות:</span>
                <b>{user.delivery_options || "-"}</b>
              </div>
            </div>
          )}

          {/* --- חדש: כרטיס שמציג את מוצרי המוכר (Inline) --- */}
          {showSellerProducts && user.role === "seller" && user.id_number && (
            <div className={styles.au_card}>
              <h4>פריטי המוכר</h4>

              {/* חיפוש בתוך מוצרי המוכר */}
              <div className={styles.au_field} style={{ marginTop: 8, marginBottom: 12 }}>
                <input
                  type="text"
                  className={styles.au_input}
                  placeholder="חפש מוצר לפי שם / קטגוריה / מזהה…"
                  value={productsQuery}
                  onChange={(e) => setProductsQuery(e.target.value)}
                />
              </div>

              {/* מצבי טעינה / ריק / רשימה */}
              {productsLoading ? (
                <div className={styles.au_state}>טוען מוצרים…</div>
              ) : filteredProducts.length === 0 ? (
                <div className={styles.au_state}>לא נמצאו מוצרים למוכר זה.</div>
              ) : (
                <div className={styles.productsGrid /* מוגדר ב-CSS למטה */}>
                  {filteredProducts.map((p) => (
                    <div key={p.product_id} className={styles.productsGridItem}>
                      <ProductCardUnified
                        viewer="admin"
                        product={{ ...p, status: p.status || p.product_status }}
                        onOpenDetails={(prod) => navigate(`/product/${prod.product_id}`)} // פתיחת דף פרטי מוצר קיים
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
