import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../auth/AuthContext";
import { getProductById, getSellerDeliveryOptions, renderStars } from "../../services/productApi";
import styles from "./ProductPage.module.css";
import CustomModal from "../../components/CustomModal/CustomModal";
import LoginForm from "../../components/LoginForm/LoginForm";
import {
  getQuotationsByProductId,
  registerToQuotation,
  cancelQuotationRegistration,
} from "../../services/quotationApi";
import { uploadIdCard } from "../../services/authApi";

// 🆕 שליפת רשומת המכירה של המוצר
import { getAllSales } from "../../services/saleApi"; // 🆕

function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, setUser } = useAuth();

  const [product, setProduct] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [idNumberInput, setIdNumberInput] = useState("");
  const [idPhotoFile, setIdPhotoFile] = useState(null);
  const [showIdForm, setShowIdForm] = useState(false);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [shouldContinueRegistration, setShouldContinueRegistration] = useState(false);

  const [modalConfig, setModalConfig] = useState({
    title: "",
    message: "",
    confirmText: "",
    cancelText: "",
    onConfirm: null,
    onCancel: null,
    extraButtonText: "",
    onExtra: null,
  });

  const [sellerOption, setSellerOption] = useState("delivery");
  // 🔇 הסרתי סטייטים שלא נעשה בהם שימוש כדי לנקות אזהרות ESLint
  // const [deliveryMethod, setDeliveryMethod] = useState("delivery");        // (לא בשימוש)
  // const [sellerPickupAddress, setSellerPickupAddress] = useState(null);    // (לא בשימוש)
  const [sellerPickupAddressText, setSellerPickupAddressText] = useState("");
  const [loadingOption, setLoadingOption] = useState(false);
  const [showPickup, setShowPickup] = useState(false);

  const [sellerRating, setSellerRating] = useState(0);

  // 🆕 נשמור את רשומת ה-sale של המוצר (לכולם), ומתוכה נגזור האם נמכר ומיהו הזוכה
// ↑ בראש הקומפוננטה יחד עם שאר הסטייטים
const [saleInfo, setSaleInfo] = useState(null);     // אם המשתמש הוא הזוכה – כאן נשמור את הרשומה שלו
const [saleForProduct, setSaleForProduct] = useState(null); // 🆕 לכל המקרה – רשומת sale של המוצר (אם קיימת)

// 🆕 טוען את רשומת ה-sale עבור המוצר, ואם המשתמש הוא הזוכה – שומר גם ב-saleInfo
useEffect(() => {
  async function loadSale() {
    try {
      if (!id) return;
      const res = await getAllSales();
      const list = res?.data || res || [];
      const prodSale = list.find(s => String(s.product_id) === String(id));
      setSaleForProduct(prodSale || null);

      if (prodSale && user?.id_number &&
          String(prodSale.buyer_id_number) === String(user.id_number)) {
        setSaleInfo(prodSale);        // המשתמש הוא הזוכה
      } else {
        setSaleInfo(null);            // לא זוכה / אין רשומת sale
      }
    } catch (e) {
      console.error("טעינת sale נכשלה:", e);
      setSaleForProduct(null);
      setSaleInfo(null);
    }
  }
  loadSale();
}, [id, user?.id_number]);

  // ===== טעינת אפשרויות משלוח של המוכר =====
  useEffect(() => {
    async function loadSellerOption() {
      setLoadingOption(true);
      try {
        const { option, pickupAddressText, rating } = await getSellerDeliveryOptions(id);
        setSellerOption(option);
        setSellerPickupAddressText(option === "delivery+pickup" ? (pickupAddressText || "") : "");
        setSellerRating(rating);
      } catch {
        setSellerOption("delivery");
        setSellerPickupAddressText("");
        setSellerRating(0);
      } finally {
        setLoadingOption(false);
      }
    }
    loadSellerOption();
    setShowPickup(false);
  }, [id]);

  // ===== טעינת פרטי המוצר =====
  useEffect(() => {
    async function fetchProduct() {
      try {
        const data = await getProductById(id);
        setProduct(data);
      } catch {
        openModal({
          title: "שגיאה",
          message: "שגיאה בטעינת פרטי המוצר",
          confirmText: "סגור",
          onCancel: () => setShowModal(false),
        });
      }
    }
    fetchProduct();
  }, [id]);

  // ===== ספירה לאחור עד תחילת המכירה =====
  const [startCountdownSec, setStartCountdownSec] = useState(null);
  useEffect(() => {
    if (!product?.start_date) {
      setStartCountdownSec(null);
      return;
    }
    const startMs = new Date(product.start_date).getTime();
    const tick = () => {
      const now = Date.now();
      const diffSec = Math.max(Math.floor((startMs - now) / 1000), 0);
      setStartCountdownSec(diffSec);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [product?.start_date]);

  // ===== המשך הרשמה אוטומטי אחרי התחברות =====
  const handleRegisterToSale = useCallback(() => {
    if (!user || !user.email) {
      openModal({
        title: "התחברות נדרשת",
        message: "כדי להירשם למוצר זה, עליך להתחבר או להירשם לאתר",
        confirmText: "התחברות",
        onConfirm: () => {
          setShowModal(false);
          setShowLoginPopup(true);
        },
        extraButtonText: "הרשמה",
        onExtra: () => navigate("/register"),
      });
      return;
    }
    if (!user.id_number || !user.id_card_photo) {
      setShowIdForm(true);
      return;
    }
    completeRegistration(user.id_number);
  }, [user, navigate]); // 🆕 useCallback כדי לשקט ESLint

  useEffect(() => {
    if (user && shouldContinueRegistration) {
      handleRegisterToSale();
      setShouldContinueRegistration(false);
    }
  }, [user, shouldContinueRegistration, handleRegisterToSale]); // 🆕 נוספה תלות

  // ===== בדיקת "רשום להצעה" (price === 0 ב-quotation) =====
  useEffect(() => {
    if (!user?.id_number || !product) return;
    async function checkRegistration() {
      try {
        const data = await getQuotationsByProductId(id);
        const alreadyRegistered = data.some(
          (q) => q.buyer_id_number === user.id_number && Number(q.price) === 0
        );
        setIsRegistered(alreadyRegistered);
      } catch {
        openModal({
          title: "שגיאה",
          message: "שגיאה בבדיקת הרשמה למכרז",
          confirmText: "סגור",
          onCancel: () => setShowModal(false),
        });
      }
    }
    checkRegistration();
  }, [product, user, id]); // 🆕 הוספתי id לתלויות

  // ===== שליפת רשומת sale של המוצר (ללא קשר למי נכנס) =====

  // ===== מודאל כללי =====
  const openModal = ({
    title,
    message,
    confirmText,
    onConfirm,
    cancelText,
    onCancel,
    extraButtonText,
    onExtra,
  }) => {
    setModalConfig({
      title,
      message,
      confirmText,
      cancelText,
      onConfirm,
      onCancel,
      extraButtonText,
      onExtra,
    });
    setShowModal(true);
  };

  // ===== הרשמה למוצר =====
const completeRegistration = async (idNum) => {
  try {
    // 🛡️ productId בטוח – מהמוצר אם קיים, אחרת מה־URL
    const productId = product?.product_id ?? Number(id);
    if (!productId) {
      openModal({
        title: "שגיאה",
        message: "לא נמצאה מזהה מוצר להרשמה. נסה/י לרענן את העמוד ולנסות שוב.",
        confirmText: "סגור",
        onCancel: () => setShowModal(false),
      });
      return;
    }

    const res = await registerToQuotation(productId, idNum);

    // תאריך/שעה רק אם יש product
    const dateStr = product?.start_date ? formatDate(product.start_date) : "";
    const timeStr = product?.start_date ? formatTime(product.start_date) : "";

    if (res.success) {
      setIsRegistered(true);
      setShowIdForm(false);
      openModal({
        title: "נרשמת!",
        message: dateStr ? `המכירה תחל בתאריך ${dateStr} בשעה ${timeStr}` : "נרשמת למכירה בהצלחה.",
        confirmText: "אישור",
        onCancel: () => setShowModal(false),
      });
    } else if (res.message === "כבר נרשמת למכירה הזו") {
      setIsRegistered(true);
      openModal({
        title: "כבר נרשמת!",
        message: dateStr ? `כבר נרשמת למכירה זו! המכירה תחל בתאריך ${dateStr} בשעה ${timeStr}` : "כבר נרשמת למכירה זו.",
        confirmText: "הבנתי",
        onCancel: () => setShowModal(false),
      });
    } else {
      throw new Error(res.message || "שגיאה לא ידועה");
    }
  } catch (error) {
    console.error("שגיאה בהרשמה למכרז:", error);
    openModal({
      title: "שגיאה",
      message: "שגיאה בעת ניסיון ההרשמה למכרז",
      confirmText: "סגור",
      onCancel: () => setShowModal(false),
    });
  }
};


  const handleIdSubmit = async (e) => {
    e.preventDefault();
    if (!idNumberInput || !idPhotoFile) {
      openModal({
        title: "שגיאה",
        message: "נא להזין תעודת זהות ולצרף קובץ",
        confirmText: "סגור",
        onCancel: () => setShowModal(false),
      });
      return;
    }
    try {
      await uploadIdCard({
        idNumber: idNumberInput,
        idPhotoFile: idPhotoFile,
        email: user.email,
      });
      setUser({
        ...user,
        id_number: idNumberInput,
        id_card_photo: "uploaded",
      });
      setShowIdForm(false);
      completeRegistration(idNumberInput);
    } catch {
      openModal({
        title: "שגיאה",
        message: "שגיאה בשמירת תעודת זהות",
        confirmText: "סגור",
        onCancel: () => setShowModal(false),
      });
    }
  };

  const handleCancelRegistration = async () => {
    try {
      await cancelQuotationRegistration(product.product_id, user.id_number);
      setIsRegistered(false);
      openModal({
        title: "הוסרה ההרשמה",
        message: "הוסרת מהמכרז בהצלחה",
        confirmText: "סגור",
        onCancel: () => setShowModal(false),
      });
    } catch {
      openModal({
        title: "שגיאה",
        message: "שגיאה בהסרת ההשתתפות",
        confirmText: "סגור",
        onCancel: () => setShowModal(false),
      });
    }
  };

  // ===== עזרי זמן ותאריך =====
  const formatDate = (isoDate) => {
    const date = new Date(isoDate);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatTime = (isoDate) => {
    const date = new Date(isoDate);
    return date.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  };

  function formatCountdown(total) {
    if (total == null) return "";
    const d = Math.floor(total / 86400);
    const h = Math.floor((total % 86400) / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const hh = String(h).padStart(2, "0");
    const mm = String(m).padStart(2, "0");
    const ss = String(s).padStart(2, "0");
    return d > 0 ? `${d} ימים ${hh}:${mm}:${ss}` : `${hh}:${mm}:${ss}`;
  }

  function timeToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== "string") return "";
    const parts = timeStr.split(":").map(Number);
    const h = parts[0] || 0;
    const m = parts[1] || 0;
    return String(h * 60 + m);
  }
// 🆕 מפענח "MM" או "HH:MM" או "HH:MM:SS" למילישניות
function parseDurationToMs(timeStr) {
  if (timeStr == null) return null;
  const parts = String(timeStr).trim().split(":").map(v => Number(v));
  if (parts.some(n => Number.isNaN(n))) return null;

  let h = 0, m = 0, s = 0;
  if (parts.length === 3) {
    [h, m, s] = parts;
  } else if (parts.length === 2) {
    [h, m] = parts;
  } else if (parts.length === 1) {
    // אם קיבלנו רק מספר אחד — נתייחס אליו כאל "דקות"
    m = parts[0];
  }
  return ((h * 3600) + (m * 60) + s) * 1000;
}

// 🆕 להציג משך בדקות בצורה עקבית
function durationToMinutesDisplay(timeStr) {
  const ms = parseDurationToMs(timeStr);
  return ms == null ? "" : String(Math.round(ms / 60000));
}

  // ===== מוקדם: מוכר/אדמין → עורך המוצר =====
  if (!product) return <p>טוען מוצר...</p>;
  const ProductEditor = require("../../components/productEditor/productEditor").default;
  const images = product.images || [];
  const isAdmin = user?.role === "admin";
  const isOwner = user?.role === "seller" && String(user?.id_number) === String(product.seller_id_number);
  if (isAdmin || isOwner) {
    return (
      <ProductEditor
        productId={id}
        onSaved={() => window.history.back()}
        onCancel={() => window.history.back()}
      />
    );
  }

  // ===== קביעה: האם המוצר נמכר? האם המשתמש הנוכחי הוא הזוכה? =====

  // 🆕 כרטיס "פרטי ההזמנה שלך" (מוצג רק לזוכה)
  const OrderDetails = ({ sale }) => {
    if (!sale) return null;
    const method = String(sale.delivery_method || "").toLowerCase();
    const methodText = method === "pickup" ? "איסוף עצמי" : "משלוח";
    const shipped = sale.sent === "yes";
    const delivered = sale.is_delivered === 1 || sale.is_delivered === "1";
    const statusText = delivered ? "📦 נמסר" : shipped ? "נשלח" : "ממתין לשליחת המוכר";
    return (
      <div className={styles.orderCard}>
        <h3 className={styles.orderTitle}>פרטי ההזמנה שלך</h3>

        <div className={styles.orderRow}>
          <span className={styles.orderLabel}>מחיר סופי:</span>
          <span>{sale.final_price ? `${sale.final_price} ₪` : "-"}</span>
        </div>

        <div className={styles.orderRow}>
          <span className={styles.orderLabel}>שיטת מסירה:</span>
          <span>{methodText}</span>
        </div>

        {method === "delivery" && (
          <>
            <div className={styles.orderRow}><span className={styles.orderLabel}>עיר:</span><span>{sale.city || "-"}</span></div>
            <div className={styles.orderRow}><span className={styles.orderLabel}>רחוב:</span><span>{sale.street || "-"}</span></div>
            <div className={styles.orderRow}>
              <span className={styles.orderLabel}>מס' בית / דירה:</span>
              <span>{(sale.house_number || "-")}/{sale.apartment_number ?? "-"}</span>
            </div>
            <div className={styles.orderRow}><span className={styles.orderLabel}>מיקוד:</span><span>{sale.zip || "-"}</span></div>
            <div className={styles.orderRow}><span className={styles.orderLabel}>מדינה:</span><span>{sale.country || "-"}</span></div>
          </>
        )}

        <div className={styles.orderRow}><span className={styles.orderLabel}>טלפון ליצירת קשר:</span><span>{sale.phone || "-"}</span></div>
        <div className={styles.orderRow}><span className={styles.orderLabel}>הערות:</span><span>{sale.notes || "-"}</span></div>

        <div className={styles.orderRow}>
          <span className={styles.orderLabel}>סטטוס משלוח:</span>
          <span className={`${styles.badge} ${delivered ? styles.toneGreen : styles.toneAmber}`}>{statusText}</span>
        </div>
      </div>
    );
  };


// 🆕 סיום לפי זמן: start_date + end_time
const endedByTime = (() => {
  if (!product?.start_date || !product?.end_time) return false;
  const startMs = new Date(product.start_date).getTime();
  const durMs   = parseDurationToMs(product.end_time);
  if (!Number.isFinite(startMs) || !durMs) return false;
  return Date.now() >= (startMs + durMs);
})();

// האם קיימת רשומת sale (יכול להיות שיש זוכה)
const hasSale = !!saleForProduct;

// המשתמש הוא הזוכה רק אם קיימת רשומה וב־buyer_id_number יש התאמה
const isWinner = hasSale &&
  user?.id_number &&
  String(saleForProduct.buyer_id_number) === String(user.id_number);

// המכרז הסתיים אם יש רשומת sale או שפג הזמן
const isEnded = hasSale || endedByTime;

console.log("נגמר?",isEnded)


  return (
    <div className={styles.page}>
      <div className={styles.content}>

        {/* גלריה משמאל נשארת כרגיל */}
        <div className={styles.imageWrapper}>
          {images.length > 0 ? (
            <div className={styles.gallery}>
              <img
                src={`http://localhost:5000${images[currentIndex]}`}
                alt={`תמונה ${currentIndex + 1}`}
                onClick={() => setIsModalOpen(true)}
                className={styles.image}
                style={{ cursor: "zoom-in" }}
              />
              <div className={styles.imageControls}>
                <button
                  className={styles.imageButton}
                  onClick={() => setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)}
                  aria-label="תמונה קודמת"
                >‹</button>
                <span className={styles.imageIndex}>{currentIndex + 1} / {images.length}</span>
                <button
                  className={styles.imageButton}
                  onClick={() => setCurrentIndex((prev) => (prev + 1) % images.length)}
                  aria-label="תמונה הבאה"
                >›</button>
              </div>
            </div>
          ) : (
            <p>אין תמונות זמינות</p>
          )}
        </div>

<div className={styles.details}>
  {/* זוכה → רק פרטי הזמנה */}
  {isWinner ? (
    <>
      <h1>ברכות! זכית במוצר</h1>
      <OrderDetails sale={saleInfo} />
    </>
) : isEnded ? (
  <>
    <h1>{product.product_name}</h1>
    {/* 🆕 תמיד מציגים "לא זכית" לכל מי שלא זכה, גם אם לא נרשם */}
    <p className={styles.notice}>המכרז הסתיים — לא זכית במכרז זה.</p>
    <div style={{ display: "flex", alignItems: "center", gap: 5, margin: "10px 0", direction: "rtl" }}>
      <strong>דירוג מוכר:</strong>{renderStars(sellerRating)}<span>({sellerRating})</span>
    </div>
  </>

  ) : (
    /* המכרז עדיין לא הסתיים → תצוגת מוצר רגילה שלך */
    <>
      <h1>{product.product_name}</h1>
      <p className={styles.description}>{product.description}</p>
      <p className={styles.price}>מחיר פתיחה: ₪{product.price}</p>

      {!loadingOption && sellerOption === "delivery" && (
        <p className={styles.infoNote}>מוצר זה ניתן <b>רק לשליחה</b>.</p>
      )}
      {!loadingOption && sellerOption === "delivery+pickup" && (
        <div className={styles.infoNote}>
          מוצר זה ניתן <b>גם לשליחה וגם לאיסוף עצמי</b> מכתובת המוכר.
          <div style={{ marginTop: 8 }}>
            <button
              type="button"
              className={`${styles.linkLikeButton} ${showPickup ? styles.linkLikeButtonActive : ""}`}
              onClick={() => setShowPickup(v => !v)}
            >
              הצג/הסתר כתובת המוכר
            </button>
            {showPickup && (
              <div className={styles.pickupBox}>
                {sellerPickupAddressText || <small>(כתובת המוכר לא זמינה כרגע)</small>}
              </div>
            )}
          </div>
        </div>
      )}

      {startCountdownSec !== null && startCountdownSec > 0 && (
        <p className={styles.countdown}>המכירה תחל בעוד {formatCountdown(startCountdownSec)}</p>
      )}
<p className={styles.status}>
  זמן המכירה למוצר זה הוא {durationToMinutesDisplay(product.end_time)} דקות
</p>

      {isRegistered ? (
        <p className={styles.success}>נרשמת למכירה זו!</p>
      ) : (
        <button className={styles.bidButton} onClick={handleRegisterToSale}>
          {user ? "הירשם/י למכירה" : "התחבר/י והירשם/י למכירה"}
        </button>
      )}

 {showIdForm && (
  <form onSubmit={handleIdSubmit} className={styles.idForm} dir="rtl">
    {/* כותרת */}
    <h3>נא להזין תעודת זהות ולצרף תמונה</h3>

    {/* שדה ת״ז */}
    <label>
      מספר תעודת זהות:
      <input
        type="text"
        value={idNumberInput}
        onChange={(e) => setIdNumberInput(e.target.value)}
        required
      />
    </label>

    {/* העלאת צילום ת״ז */}
    <label>
      העלאת צילום תעודת זהות:
      <input
        type="file"
        accept="image/*,.pdf"
        onChange={(e) => setIdPhotoFile(e.target.files[0])}
        required
      />
    </label>

    {/* שליחה */}
    <button type="submit">שלח ואשר הרשמה</button>
  </form>
)}


      {isRegistered && (
        <>
          <button className={styles.cancelButton} onClick={handleCancelRegistration}>הסרה מהמכרז</button>
          <button className={styles.bidButton} onClick={() => navigate(`/live-auction/${product.product_id}`)}>
            למעבר למכירה הפומבית לחץ כאן!
          </button>
        </>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 5, margin: "10px 0", direction: "rtl" }}>
        <strong>דירוג מוכר:</strong>{renderStars(sellerRating)}<span>({sellerRating})</span>
      </div>
    </>
  )}
</div>



      </div>

      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
          <img
            src={`http://localhost:5000${images[currentIndex]}`}
            alt="תמונה מוגדלת"
            className={styles.modalImage}
          />
        </div>
      )}

      {showModal && modalConfig.title && (
        <CustomModal
          title={modalConfig.title}
          message={modalConfig.message}
          confirmText={modalConfig.confirmText}
          cancelText={modalConfig.cancelText}
          onConfirm={modalConfig.onConfirm}
          onCancel={modalConfig.onCancel || (() => setShowModal(false))}
          extraButtonText={modalConfig.extraButtonText}
          onExtra={modalConfig.onExtra}
          onClose={() => setModalConfig(false)}
        />
      )}

      {showLoginPopup && (
        <CustomModal
          message={
            <LoginForm
              onSuccess={(userFromLogin) => {
                setUser(userFromLogin);
                setShowLoginPopup(false);
                setShowModal(false);
                setShouldContinueRegistration(true);
              }}
            />
          }
          onClose={() => setShowLoginPopup(false)}
          hideClose={false}
          disableBackdropClose={false}
        />
      )}
    </div>
  );
}

export default ProductPage;
