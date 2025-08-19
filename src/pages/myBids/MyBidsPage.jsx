// src/pages/MyBidsPage/MyBidsPage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./MyBidsPage.module.css";
import { useAuth } from "../../auth/AuthContext";
import CustomModal from "../../components/CustomModal/CustomModal";
import StarRater from "../../components/StarRater/StarRater";
import { getUserBids } from "../../services/quotationApi";
import { getAllSales, markProductDelivered, rateSeller } from "../../services/saleApi";

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
function Badge({ tone = "toneGray", children }) {
  return <span className={`${styles.badge} ${styles[tone]}`}>{children}</span>;
}

/* ---------------------------------------------
   כרטיס פריט לרוכש (משמש זהה בכל המצבים)
---------------------------------------------- */
function BuyerCard({
  kind,                 // "registered" | "won"
  item,                 // אובייקט מאוחד של מכירה/מוצר
  hasSale = false,              // ← חדש
  onMarkDelivered,      // קליק על "סמן כבוצע/נאסף"
  onOpenProduct,        // כניסה לעמוד המוצר/הזמנה
  pending,              // סטטוס שמירה (כיבוי כפתור)
}) {
  const base = "http://localhost:5000";
  const img  = item?.images?.[0] ? `${base}${item.images[0]}` : "";
  const name = item?.product_name || "מוצר";
  const startDate = item?.start_date ? new Date(item.start_date) : null;
  const { user } = useAuth();

  // נירמול ערכים כדי למנוע הבדלי-טיפוסים
  const norm        = (v) => String(v ?? "").toLowerCase().trim();
  const method      = norm(item?.delivery_method);                        // "delivery" | "pickup" | ""
  const isDelivered = norm(item?.is_delivered) === "1" || norm(item?.is_delivered) === "true";
  const isSent      = norm(item?.sent) === "yes" || norm(item?.sent) === "1" || norm(item?.sent) === "true";
 let registeredLabel = "נרשמת למכירה";
  if (kind === "registered") {
    const isLive0        = String(item?.is_live) === "0";
    const statusForSale  = norm(item?.product_status) === "for sale";
    const hasNoWinner    = !item?.winner_id_number;
    const statusSale     = norm(item?.product_status) === "sale";
    const statusNotSold     = norm(item?.product_status) === "not sold";
    const winnerIdNumber = item?.winner_id_number === user?.id_number;
    console.log("winner?",winnerIdNumber);
    if (isLive0 && statusForSale && hasNoWinner) {
      registeredLabel = "המכירה טרם החלה";
    } else if (winnerIdNumber) {
      registeredLabel = "אתה הזוכה במכירה";
    }else  {
      registeredLabel = "המכירה הסתיימה-לא זכית";
    } 
  }
  // סטטוס טקסטואלי אחיד לשני המצבים (עוקב אחרי isDelivered/isSent)
  let sentLabel = "שיטת מסירה לא הוגדרה";
  if (method === "delivery") {
    sentLabel = isDelivered
      ? "אישרת שהמשלוח התקבל"
      : (isSent ? "המוצר נשלח" : "המוצר טרם נשלח");
  } else if (method === "pickup") {
    sentLabel = isDelivered
      ? "אישרת שהמוצר נאסף"
      : "המוצר טרם נאסף";
  }

  const deliveryTone = isDelivered ? "toneGreen" : (method ? "toneAmber" : "toneGray");

  return (
    <div className={styles.card} dir="rtl">
      {/* ראש הכרטיס – תמונה + כותרת + תג סטטוס */}
      <div
        className={styles.cardHead}
        onClick={onOpenProduct}
        role="button"
        tabIndex={0}
      >
        {img ? (
          <img className={styles.cardImg} src={img} alt={name} />
        ) : (
          <div className={styles.noImg}>אין תמונה</div>
        )}

        <div className={styles.cardTitleWrap}>
  <h3 className={styles.cardTitle} title={name}>{name}</h3>
  {kind === "registered" ? (
    <Badge tone="toneBlue">{registeredLabel}</Badge>  
  ) : (
    <Badge tone={deliveryTone}>סטטוס: {sentLabel}</Badge>
  )}
</div>

      </div>

      {/* גוף הכרטיס – שורות מידע מסודרות בשתי עמודות */}
      <div className={styles.cardBody}>
        {kind === "registered" ? (
          <>
            <div className={styles.row}>
              <span className={styles.label}>תאריך זכייה:</span>
              <span>{startDate ? startDate.toLocaleDateString("he-IL") : "-"}</span>
            </div>
            <div className={styles.row}>
              <span className={styles.label}>שעת התחלה:</span>
              <span>
                {startDate
                  ? startDate.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })
                  : "-"}
              </span>
            </div>
          </>
        ) : (
          <>
            <div className={styles.row}>
              <span className={styles.label}>מחיר סופי:</span>
              <span>{item?.final_price ? `${item.final_price} ₪` : "-"}</span>
            </div>
            <div className={styles.row}>
              <span className={styles.label}>שיטת מסירה:</span>
              <span>{method === "delivery" ? "משלוח" : method === "pickup" ? "איסוף עצמי" : "לא הוגדר"}</span>
            </div>

            {/* אם יש כבר דירוג להצגה */}
            {item?.rating != null && (
              <div className={styles.row}>
                <span className={styles.label}>הדירוג שלך:</span>
                <span>
                  {Array.from({ length: 5 }).map((_, i) => (i < Math.round(item.rating) ? "★" : "☆"))}
                  <span style={{ marginInlineStart: 6 }}>({item.rating})</span>
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* תחתית הכרטיס – כפתורים עקביים בשני המצבים */}
      <div className={styles.cardFooter}>
        <button
          className={styles.viewButton}
          type="button"
          onClick={onOpenProduct}
        >
          צפייה בפרטי ההזמנה
        </button>

        {/* משלוח: כפתור רק אם נשלח ועדיין לא נמסר */}
        {kind === "won" && method === "delivery" && isSent && !isDelivered && (
          <button
            className={styles.primaryBtn}
            type="button"
            onClick={onMarkDelivered}
            disabled={pending}
          >
            {pending ? "מעבד..." : "סמן כבוצע"}
          </button>
        )}

        {/* איסוף: כפתור אם טרם נאסף */}
        {kind === "won" && method === "pickup" && !isDelivered && (
          <button
            className={styles.primaryBtn}
            type="button"
            onClick={onMarkDelivered}
            disabled={pending}
          >
            {pending ? "מעבד..." : "סמן שנאסף"}
          </button>
        )}
      </div>
    </div>
  );
}

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
// האם למוצר יש רשומת sale
const saleProductIds = useMemo(
  () => new Set((Array.isArray(sales) ? sales : []).map(s => s.product_id)),
  [sales]
);

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
              {filteredRegisteredBids.map((bid, i) => (
  <div className={styles.gridItem} key={`${bid.product_id}-${i}`}>
    <BuyerCard
      kind="registered"
      item={bid}
      hasSale={saleProductIds.has(bid.product_id)}   // ← חדש
      onOpenProduct={() => navigate(`/product/${bid.product_id}`)}
    />
  </div>
))}

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
