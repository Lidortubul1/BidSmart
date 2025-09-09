// src/pages/MyBidsPage/MyBidsPage.jsx
// דף "ההצעות שלי": מציג שתי תצוגות — הצעות שנרשמתי ומוצרים שזכיתי בהם — עם תפריט בחירה, חיפוש, וכרטיס אחיד לכל פריט; כולל אישור מסירה (משלוח/איסוף) עם מודאל ועדכון אופטימי, פתיחת מודאל דירוג למוכר (StarRater), ומימוש טעינת נתונים דרך quotationApi/getUserBids ו-saleApi (getAllSales, markProductDelivered, rateSeller).

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./MyBidsPage.module.css"
import { useAuth } from "../../auth/AuthContext";
import CustomModal from "../../components/CustomModal/CustomModal";
import StarRater from "../../components/StarRater/StarRater";
import { getUserBids } from "../../services/quotationApi";
import { getAllSales, markProductDelivered, rateSeller } from "../../services/saleApi";
import BuyerCard from "./BuyerCard"
/* ---------------------------------------------
   קבועים
---------------------------------------------- */
const VIEW_FILTERS = [
  { value: "registered", label: "הצעות שנרשמתי" },
  { value: "won",        label: "מוצרים שזכיתי בהם" },
];

/* ---------------------------------------------
   קומפוננטות קטנות
---------------------------------------------- */


/* ---------------------------------------------
   כרטיס פריט לרוכש (משמש זהה בכל המצבים)
---------------------------------------------- */


/* ---------------------------------------------
   העמוד כולו
---------------------------------------------- */
export default function MyBidsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // מצבים כלליים
  const [bids, setBids]                 = useState([]);
  const [sales, setSales]               = useState([]);
  const [products, setProducts]         = useState([]);
  const [view, setView]                 = useState("registered");
  const [searchQuery, setSearchQuery]   = useState("");

  // מודאל כללי
  const [modalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState({
    title: "", message: "", confirmText: "", cancelText: "",
    onConfirm: null, onCancel: null,
  });

  // סט נייטיבי לזיהוי פריטים שנמצאים בעיבוד כדי לנטרל כפתור זמנית
  const [pendingDeliveredIds, setPendingDeliveredIds] = useState(new Set());

  // דירוג
  const [rateModalOpen, setRateModalOpen]       = useState(false);
  const [rateForProductId, setRateForProductId] = useState(null);
  const [rateValue, setRateValue]               = useState(0);
  const [savingRating, setSavingRating]         = useState(false);

  // Dropdown – פתיחה/סגירה
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pickerRef = useRef(null);

  /* ----------------------------
     ניהול תפריט הפילטר
  ----------------------------- */
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

  const currentFilterLabel =
    VIEW_FILTERS.find(f => f.value === view)?.label || VIEW_FILTERS[0].label;

  // יוטיליטי לפתיחת מודאל כללי
  const showModal = ({ title, message, confirmText, cancelText, onConfirm, onCancel }) => {
    setModalContent({ title, message, confirmText, cancelText, onConfirm, onCancel });
    setModalVisible(true);
  };

  /* ----------------------------
     טעינת נתונים ראשונית
  ----------------------------- */
  useEffect(() => {
    if (!user?.id_number) return;
    async function fetchData() {
      try {
        const [bidsRes, salesRes] = await Promise.all([
          getUserBids(user.id_number),
          getAllSales(),
        ]);
        setBids(Array.isArray(bidsRes) ? bidsRes : []);
        setSales(Array.isArray(salesRes) ? salesRes : []);
      } catch (err) {
        console.error("שגיאת טעינה:", err);
        showModal({
          title: "שגיאה",
          message: "שגיאה בטעינת הנתונים",
          confirmText: "סגור",
          onConfirm: () => setModalVisible(false),
        });
      }
    }
    fetchData();
  }, [user?.id_number]);

  useEffect(() => {
    async function fetchProducts() {
      const productsRes = await getAllSales();
      setProducts(productsRes.data || productsRes || []);
    }
    fetchProducts();
  }, []);


  /* ----------------------------
     איחוד נתוני מכרזים/מכירות עם מוצרים
     (לצורך הכרטיס האחיד)
  ----------------------------- */
  const registeredBids = useMemo(() => {
    return bids.map(bid => {
      const product = products.find(p => p.product_id === bid.product_id);
      return { ...bid, ...product };
    });
  }, [bids, products]);

  const wonSalesWithProduct = useMemo(() => {
    const won = Array.isArray(sales)
      ? sales.filter(s => String(s.buyer_id_number) === String(user?.id_number))
      : [];
    return won.map(sale => {
      const product = products.find(p => p.product_id === sale.product_id);
      // המוצר קודם כדי שלא "ימחוק" שדות מהמכירה (או להפך) — הבחירה כאן שמרה על ההתנהגות שלך
      return { ...product, ...sale };
    });
  }, [sales, products, user?.id_number]);

  /* ----------------------------
     חיפושים לפי שם מוצר
  ----------------------------- */
  const filteredRegisteredBids = registeredBids.filter(bid =>
    (bid.product_name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredWonSales = wonSalesWithProduct.filter(sale =>
    (sale.product_name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  /* ----------------------------
     סימון נמסר/נאסף (ללא שינוי לוגיקה)
     + עדכון אופטימי + פתיחת דירוג
  ----------------------------- */
  const handleMarkDelivered = (product_id, { openRating = true } = {}) => {
    showModal({
      title: "אישור קבלה",
      message: "לאשר שקיבלת את המוצר? סטטוס ההזמנה יעודכן ל'נמסר'.",
      cancelText: "ביטול",
      confirmText: "אישור קבלה",
      onCancel: () => setModalVisible(false),
      onConfirm: async () => {
        setModalVisible(false);

        // נטרול זמני של הכפתור
        setPendingDeliveredIds(prev => new Set(prev).add(product_id));

        // עדכון אופטימי — נשמור עותק ל־rollback
        const rollback = [...sales];
        setSales(prev =>
          prev.map(s => (s.product_id === product_id ? { ...s, is_delivered: 1 } : s))
        );

        try {
          await markProductDelivered(product_id);
          if (openRating) {
            setRateForProductId(product_id);
            setRateValue(0);
            setRateModalOpen(true);
          }
        } catch (err) {
          setSales(rollback);
          showModal({
            title: "שגיאה",
            message: "שגיאה בעת סימון כבוצע",
            confirmText: "סגור",
            onConfirm: () => setModalVisible(false),
          });
        } finally {
          setPendingDeliveredIds(prev => {
            const next = new Set(prev);
            next.delete(product_id);
            return next;
          });
        }
      },
    });
  };

  /* ----------------------------
     שמירת דירוג
  ----------------------------- */
  async function submitRating() {
    if (!rateForProductId || !rateValue) return;
    try {
      setSavingRating(true);
      await rateSeller(rateForProductId, rateValue);
      setSales(prev =>
        prev.map(s =>
          s.product_id === rateForProductId ? { ...s, rating: Number(rateValue) } : s
        )
      );
      setRateModalOpen(false);
    } catch (err) {
      showModal({
        title: "שגיאה",
        message: "לא ניתן לשמור דירוג כרגע",
        confirmText: "סגור",
        onConfirm: () => setModalVisible(false),
      });
    } finally {
      setSavingRating(false);
    }
  }

  /* ----------------------------
     תצוגה
  ----------------------------- */
  return (
    <div className={styles.page}>
      {/* HERO עליון */}
      <div className={styles.hero}>
        <div className={styles.heroText}>
          <h1>ההצעות שלי</h1>
          <p className={styles.subText}>צפה בהצעות שנרשמת ובמוצרים שזכית בהם</p>

          {/* בחירת פילטר */}
          <div className={styles.filterBar} ref={pickerRef}>
            <button
              type="button"
              className={styles.filterTrigger}
              onClick={() => setIsMenuOpen(v => !v)}
              aria-expanded={isMenuOpen}
              aria-haspopup="listbox"
            >
              {currentFilterLabel}
              <svg
                className={styles.chevron}
                width="18"
                height="18"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            </button>

            {isMenuOpen && (
              <ul className={styles.filterMenu} role="listbox">
                {VIEW_FILTERS.map((opt, i) => (
                  <li key={opt.value}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={view === opt.value}
                      className={`${styles.filterOption} ${view === opt.value ? styles.activeOption : ""}`}
                      style={{ "--i": i }}
                      onClick={() => {
                        setView(opt.value);
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
        </div>
      </div>

      {/* אזור התוכן */}
      <section className={styles.productsSection}>
        {/* חיפוש לפי שם מוצר */}
        <div className={styles.searchContainer}>
          <input
            type="text"
            placeholder="חפש מוצר לפי שם..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>

     {/* טאב: הצעות שנרשמתי */}
{view === "registered" && (
  filteredRegisteredBids.length === 0 ? (
    <p className={styles.empty}>לא נרשמת למוצרים</p>
  ) : (
    <div className={styles.grid}>
      {filteredRegisteredBids.map((bid, i) => {
        // --- שינוי נראות בלבד: מיזוג מידע מכירה אם המשתמש הוא הזוכה ---
        const isWinner = String(bid?.winner_id_number) === String(user?.id_number);
        // אם יש רשומת מכירה למוצר הזה ולמשתמש הנוכחי – נשתמש בה כדי לקבל סטטוס מסירה וכו'
        const saleForThis = isWinner
          ? (Array.isArray(sales) ? sales.find(
              s => s.product_id === bid.product_id &&
                   String(s.buyer_id_number) === String(user?.id_number)
            ) : null)
          : null;

        // אייטם מאוחד (כמו בטאב "won") כדי שה-BuyerCard יציג את אותו ה-UI
        const mergedItem = saleForThis ? { ...bid, ...saleForThis } : bid;

        // אם המשתמש זכה – נציג את הכרטיס במצב "won" כדי לקבל את תגית ה"סטטוס" והכפתורים
        const kindValue = isWinner ? "won" : "registered";

        return (
          <div className={styles.gridItem} key={`${bid.product_id}-${i}`}>
            <BuyerCard
              kind={kindValue}
              item={mergedItem}
              onOpenProduct={() => navigate(`/product/${bid.product_id}`)}
              // נעביר כפתור סימון מסירה רק אם הוא באמת זכה (כמו בטאב "won")
              onMarkDelivered={
                isWinner
                  ? () => handleMarkDelivered(bid.product_id, { openRating: true })
                  : undefined
              }
              pending={pendingDeliveredIds.has(bid.product_id)}
            />
          </div>
        );
      })}
    </div>
  )
)}


        {/* טאב: מוצרים שזכיתי בהם */}
        {view === "won" && (
          filteredWonSales.length === 0 ? (
            <p className={styles.empty}>לא נמצאו זכיות</p>
          ) : (
            <div className={styles.grid}>
              {filteredWonSales.map((sale, i) => (
                <div className={styles.gridItem} key={`${sale.product_id}-${i}`}>
                  <BuyerCard
                    kind="won"
                    item={sale}
                    onOpenProduct={() => navigate(`/product/${sale.product_id}`)}
                    onMarkDelivered={() => handleMarkDelivered(sale.product_id, { openRating: true })}
                    pending={pendingDeliveredIds.has(sale.product_id)}
                  />
                </div>
              ))}
            </div>
          )
        )}
      </section>

      {/* מודאל כללי */}
      {modalVisible && (
        <CustomModal
          title={modalContent.title}
          message={modalContent.message}
          confirmText={modalContent.confirmText}
          cancelText={modalContent.cancelText}
          onConfirm={modalContent.onConfirm}
          onCancel={modalContent.onCancel || (() => setModalVisible(false))}
          onClose={() => setModalVisible(false)}
        />
      )}

      {/* מודאל דירוג (תוכן הכוכבים בתוך ה־modal) */}
      {rateModalOpen && (
        <CustomModal
          title="דרג את המוכר"
          confirmText={savingRating ? "שולח..." : "שלח דירוג"}
          cancelText="ביטול"
          onCancel={() => { setRateModalOpen(false); setRateValue(0); }}
          onConfirm={async () => {
            if (!rateForProductId || !rateValue) return;
            await submitRating();
          }}
          onClose={() => { setRateModalOpen(false); setRateValue(0); }}
          confirmDisabled={savingRating || !rateValue}
          disableBackdropClose={false}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <p style={{ marginBottom: "12px" }}>בחר דירוג:</p>
            <StarRater value={rateValue} onChange={setRateValue} size={32} spacing={10} />
          </div>
        </CustomModal>
      )}
    </div>
  );
}
