import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./MyBidsPage.module.css";
import { getUserBids } from "../../services/quotationApi";
import { getAllSales, markProductDelivered } from "../../services/saleApi";
import { useAuth } from "../../auth/AuthContext";
import CustomModal from "../../components/CustomModal/CustomModal";

const VIEW_FILTERS = [
  { value: "registered", label: "הצעות שנרשמתי" },
  { value: "won",        label: "מוצרים שזכיתי בהם" },
];

function Badge({ tone = "toneGray", children }) {
  return <span className={`${styles.badge} ${styles[tone]}`}>{children}</span>;
}

function BuyerCard({ kind, item, onMarkDelivered, onOpenProduct }) {
  const base = "http://localhost:5000";
  const img = item?.images?.[0] ? `${base}${item.images[0]}` : "";
  const name = item?.product_name || "מוצר";
  const startDate = item?.start_date ? new Date(item.start_date) : null;

  const method = String(item?.delivery_method || "").toLowerCase();
  const delivered =
    item?.is_delivered === 1 ||
    item?.is_delivered === "1" ||
    item?.sent === "yes";
  const pickupYes=  item?.sent === "yes";
  const sentLabel =
    method === "delivery"
      ? delivered ? "המוכר שלח את המוצר" : "המוצר טרם נשלח"
      : method === "pickup"
      ? delivered && pickupYes ? "המוצר נאסף על ידך" : "המוצר טרם נאסף על ידך"
      : delivered ? "נשלח / נמסר" : "שיטת מסירה לא הוגדרה";

  const deliveryTone = delivered ? "toneGreen" : "toneAmber";

  return (
    <div className={styles.card} dir="rtl">
      <div className={styles.cardHead} onClick={onOpenProduct} role="button" tabIndex={0}>
        {img ? <img className={styles.cardImg} src={img} alt={name} /> : <div className={styles.noImg}>אין תמונה</div>}
        <div className={styles.cardTitleWrap}>
          <h3 className={styles.cardTitle}>{name}</h3>
          {kind === "registered" ? (
            <Badge tone="toneBlue">נרשמת למכירה</Badge>
          ) : (
            <Badge tone={deliveryTone}>סטטוס משלוח: {sentLabel}</Badge>
          )}
        </div>
      </div>

      <div className={styles.cardBody}>
        {kind === "registered" ? (
          <>
            <div className={styles.row}>
              <span className={styles.label}>תאריך התחלה:</span>
              <span>{startDate ? startDate.toLocaleDateString("he-IL") : "-"}</span>
            </div>
            <div className={styles.row}>
              <span className={styles.label}>שעת התחלה:</span>
              <span>{startDate ? startDate.toLocaleTimeString("he-IL",{hour:"2-digit",minute:"2-digit"}) : "-"}</span>
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
          </>
        )}
      </div>

      <div className={styles.cardFooter}>
        <button className={styles.viewButton} type="button" onClick={onOpenProduct}>
          צפייה במוצר
        </button>

        {kind === "won" && method === "delivery" && (
          <button className={styles.primaryBtn} type="button" onClick={onMarkDelivered}>
            סמן כבוצע
          </button>
        )}
        {kind === "won"  && method === "pickup" && !pickupYes &&(
          <button className={styles.primaryBtn} type="button" onClick={onMarkDelivered}>
            סמן שנאסף
          </button>)}

                  {kind === "won"  && method === "pickup" && pickupYes &&(
          <button className={styles.primaryBtn} type="button" >
            סומן שנאסף
          </button>)}
      </div>
    </div>
  );
}

function MyBidsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [bids, setBids] = useState([]);
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [view, setView] = useState("registered");
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalContent, setModalContent] = useState({
    title: "", message: "", confirmText: "", cancelText: "",
    onConfirm: null, onCancel: null,
  });

  // dropdown כמו בדף המוכר
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pickerRef = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (!pickerRef.current) return;
      if (!pickerRef.current.contains(e.target)) setIsMenuOpen(false);
    }
    function onEsc(e) { if (e.key === "Escape") setIsMenuOpen(false); }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  const currentFilterLabel =
    VIEW_FILTERS.find(f => f.value === view)?.label || VIEW_FILTERS[0].label;

  const showModal = ({ title, message, confirmText, cancelText, onConfirm, onCancel }) => {
    setModalContent({ title, message, confirmText, cancelText, onConfirm, onCancel });
    setModalVisible(true);
  };

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

  const registeredBids = useMemo(() => {
    return bids.map((bid) => {
      const product = products.find((p) => p.product_id === bid.product_id);
      return { ...bid, ...product };
    });
  }, [bids, products]);

  const wonSalesWithProduct = useMemo(() => {
    const won = Array.isArray(sales)
      ? sales.filter((s) => String(s.buyer_id_number) === String(user?.id_number))
      : [];
    return won.map((sale) => {
      const product = products.find((p) => p.product_id === sale.product_id);
      return { ...sale, ...product };
    });
  }, [sales, products, user?.id_number]);

  const filteredRegisteredBids = registeredBids.filter((bid) =>
    (bid.product_name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredWonSales = wonSalesWithProduct.filter((sale) =>
    (sale.product_name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleMarkDelivered = (product_id) => {
    showModal({
      title: "אישור קבלה",
      message: "לאשר שקיבלת את המוצר? סטטוס ההזמנה יעודכן ל'נמסר'.",
      cancelText: "ביטול",
      confirmText: "אישור קבלה",
      onCancel: () => setModalVisible(false),
      onConfirm: async () => {
        setModalVisible(false);
        try {
          await markProductDelivered(product_id);
          setSales((prev) =>
            prev.map((s) => (s.product_id === product_id ? { ...s, is_delivered: 1 } : s))
          );
        } catch (err) {
          showModal({
            title: "שגיאה",
            message: "שגיאה בעת סימון כבוצע",
            confirmText: "סגור",
            onConfirm: () => setModalVisible(false),
          });
        }
      },
    });
  };

  return (
    <div className={styles.page}>
      {/* HERO עליון כמו בדף המוכר */}
      <div className={styles.hero}>
        <div className={styles.heroText}>
          <h1>ההצעות שלי</h1>
          <p className={styles.subText}>צפה בהצעות שנרשמת ובמוצרים שזכית בהם</p>

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
                {VIEW_FILTERS.map((opt, i) => (
                  <li key={opt.value}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={view === opt.value}
                      className={`${styles.filterOption} ${view === opt.value ? styles.activeOption : ""}`}
                      style={{ "--i": i }}
                      onClick={() => { setView(opt.value); setIsMenuOpen(false); }}
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
        <div className={styles.searchContainer}>
          <input
            type="text"
            placeholder="חפש מוצר לפי שם..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>

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
                    onOpenProduct={() => navigate(`/product/${bid.product_id}`)}
                  />
                </div>
              ))}
            </div>
          )
        )}

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
                    onMarkDelivered={() => handleMarkDelivered(sale.product_id)}
                  />
                </div>
              ))}
            </div>
          )
        )}
      </section>

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
    </div>
  );
}

export default MyBidsPage;
