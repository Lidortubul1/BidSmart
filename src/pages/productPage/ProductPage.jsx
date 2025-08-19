// src/pages/ProductPage/ProductPage.jsx
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../auth/AuthContext";
import { createOrder } from "../../services/paymentApi";

import styles from "./ProductPage.module.css";

import CustomModal from "../../components/CustomModal/CustomModal";
import LoginForm from "../../components/LoginForm/LoginForm";

import {
  getProductById,
  getSellerDeliveryOptions,
  renderStars,
  expireUnpaidProduct,
} from "../../services/productApi";

import {
  getQuotationsByProductId,
  registerToQuotation,
  cancelQuotationRegistration,
} from "../../services/quotationApi";

import { uploadIdCard } from "../../services/authApi";
import { getAllSales } from "../../services/saleApi"; // שליפת רשומת ה-sale של המוצר

/* =========================================================================
   פונקציות עזר טהורות (ללא תלות ב-React)
   ========================================================================= */

/** תאריך/שעה בפורמט עברי מלא (למשל "01/01/2025 בשעה 12:30") */
function formatDateTimeHe(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const date = d.toLocaleDateString("he-IL");
  const time = d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  return `${date} בשעה ${time}`;
}

/** ISO → "DD/MM/YYYY" */
function formatDate(isoDate) {
  const date = new Date(isoDate);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/** ISO → "HH:MM" (עברי) */
function formatTime(isoDate) {
  const date = new Date(isoDate);
  return date.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}

/** פורמט ספירה לאחור משניות → "DD ימים HH:MM:SS" / "HH:MM:SS" */
function formatCountdown(total) {
  if (total == null) return "";
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  const base = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(
    s
  ).padStart(2, "0")}`;

  return d > 0 ? `${d} ימים ${base}` : base;
}

/** "MM" / "HH:MM" / "HH:MM:SS" → מילישניות */
function parseDurationToMs(timeStr) {
  if (timeStr == null) return null;

  const parts = String(timeStr).trim().split(":").map((v) => Number(v));
  if (parts.some((n) => Number.isNaN(n))) return null;

  let h = 0, m = 0, s = 0;

  if (parts.length === 3) {
    [h, m, s] = parts;
  } else if (parts.length === 2) {
    [h, m] = parts;
  } else if (parts.length === 1) {
    // מספר יחיד יפורש בדקות
    m = parts[0];
  }

  return (h * 3600 + m * 60 + s) * 1000;
}

/** הצגת משך בדקות מתוך end_time (פורמטים: "MM" / "HH:MM" / "HH:MM:SS") */
function durationToMinutesDisplay(timeStr) {
  const ms = parseDurationToMs(timeStr);
  return ms == null ? "" : String(Math.round(ms / 60000));
}

/* =========================================================================
   קומפוננטת UI להצגת פרטי הזמנה לזוכה (ללא לוגיקה צד שרת)
   ========================================================================= */

function OrderDetails({ sale }) {
  if (!sale) return null;

  const method = String(sale.delivery_method || "").toLowerCase();
  const methodText = method === "pickup" ? "איסוף עצמי" : "משלוח";

  const shipped = sale.sent === "yes";
  const delivered = sale.is_delivered === 1 || sale.is_delivered === "1";
  const winDateText = sale.end_date ? formatDateTimeHe(sale.end_date) : "-";

  // סטטוס לפי שיטת מסירה
  let statusText;
  if (method === "pickup") {
    statusText = delivered ? "✅ המוצר נאסף" : "⌛ ממתין לאיסוף";
  } else {
    statusText = delivered ? "✅ נמסר" : shipped ? "📦  המוצר נשלח אלייך" : "⌛ ממתין לשליחת המוכר";
  }

  return (
    <div className={styles.orderCard}>
      <h3 className={styles.orderTitle}>פרטי ההזמנה שלך</h3>

      <div className={styles.orderRow}>
        <span className={styles.orderLabel}>תאריך זכייה:</span>
        <span>{winDateText}</span>
      </div>

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
          <div className={styles.orderRow}>
            <span className={styles.orderLabel}>עיר:</span>
            <span>{sale.city || "-"}</span>
          </div>
          <div className={styles.orderRow}>
            <span className={styles.orderLabel}>רחוב:</span>
            <span>{sale.street || "-"}</span>
          </div>
          <div className={styles.orderRow}>
            <span className={styles.orderLabel}>מס' בית / דירה:</span>
            <span>
              {(sale.house_number || "-")}/{sale.apartment_number ?? "-"}
            </span>
          </div>
          <div className={styles.orderRow}>
            <span className={styles.orderLabel}>מיקוד:</span>
            <span>{sale.zip || "-"}</span>
          </div>
          <div className={styles.orderRow}>
            <span className={styles.orderLabel}>מדינה:</span>
            <span>{sale.country || "-"}</span>
          </div>
        </>
      )}

      <div className={styles.orderRow}>
        <span className={styles.orderLabel}>טלפון ליצירת קשר:</span>
        <span>{sale.phone || "-"}</span>
      </div>

      <div className={styles.orderRow}>
        <span className={styles.orderLabel}>הערות:</span>
        <span>{sale.notes || "-"}</span>
      </div>

      <div className={styles.orderRow}>
        <span className={styles.orderLabel}>
          בחירת אופציית שילוח: {method === "pickup" ? "איסוף עצמי" : "משלוח"}
        </span>
      </div>

      <div className={styles.orderRow}>
        <span
          className={`${styles.badge} ${delivered ? styles.toneGreen : styles.toneAmber}`}
        >
          סטטוס: {statusText}
        </span>
      </div>
    </div>
  );
}

/* =========================================================================
   ProductPage – דף מוצר (קונים): הרשמה, ספירה לאחור, מצב זכייה ותשלום
   ========================================================================= */

function ProductPage() {
  /* ----- Hooks בסיסיים ----- */
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, setUser } = useAuth();

  /* ----- נתוני מוצר/מוכר/מכירה ----- */
  const [product, setProduct] = useState(null);
  const [sellerOption, setSellerOption] = useState("delivery");
  const [sellerPickupAddressText, setSellerPickupAddressText] = useState("");
  const [sellerRating, setSellerRating] = useState(0);
  const [saleInfo, setSaleInfo] = useState(null);            // רשומת sale של המשתמש (אם הוא הזוכה)
  const [saleForProduct, setSaleForProduct] = useState(null); // רשומת sale של המוצר (ללא קשר למשתמש)
  const [isWinnerFromProduct, setIsWinnerFromProduct] = useState(false); // האם המשתמש זכה לפי product
  const [isUnpaidWinner, setIsUnpaidWinner] = useState(false);           // האם הזוכה טרם שילם

  /* ----- הרשמה/זהות ----- */
  const [isRegistered, setIsRegistered] = useState(false);
  const [idNumberInput, setIdNumberInput] = useState("");
  const [idPhotoFile, setIdPhotoFile] = useState(null);
  const [showIdForm, setShowIdForm] = useState(false);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [shouldContinueRegistration, setShouldContinueRegistration] = useState(false);

  /* ----- גלריה ----- */
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  /* ----- מודאל כללי ----- */
  const [showModal, setShowModal] = useState(false);
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

  /* ----- מצבים נוספים ----- */
  const [loadingOption, setLoadingOption] = useState(false);
  const [showPickup, setShowPickup] = useState(false);
  const [startCountdownSec, setStartCountdownSec] = useState(null);
  const [paySecondsLeft, setPaySecondsLeft] = useState(null);      // דדליין תשלום (שניות)
  const [didRedirectToShipping, setDidRedirectToShipping] = useState(false);

  /* ----- ספירת זמן לתשלום לזוכה (last_bid_time + 24h) ----- */
  useEffect(() => {
    if (!product?.last_bid_time || !isWinnerFromProduct || !isUnpaidWinner) {
      setPaySecondsLeft(null);
      return;
    }

    const lastBidMs = new Date(product.last_bid_time).getTime();
    const deadlineMs = lastBidMs + 24 * 60 * 60 * 1000;

    const tick = () => {
      const left = Math.max(Math.floor((deadlineMs - Date.now()) / 1000), 0);
      setPaySecondsLeft(left);
    };

    tick(); // חישוב ראשוני
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [product?.last_bid_time, isWinnerFromProduct, isUnpaidWinner]);

  const isPaymentWindowOpen = Boolean(
    isWinnerFromProduct && isUnpaidWinner && (paySecondsLeft ?? 0) > 0
  );

  /* =========================================================================
     טעינת פרטי מוצר
     ========================================================================= */
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

  /* ----- סיום אוטומטי אם הזוכה לא שילם בתוך 24 שעות ----- */
  useEffect(() => {
    if (!product?.product_id || !isWinnerFromProduct || !isUnpaidWinner) return;
    if (paySecondsLeft !== 0) return;

    let called = false;
    (async () => {
      if (called) return;
      called = true;
      try {
        await expireUnpaidProduct(product.product_id); // product_status = 'Not sold'
        const refreshed = await getProductById(product.product_id);
        setProduct(refreshed);
      } catch (e) {
        console.error("expireUnpaidProduct error:", e);
      }
    })();
  }, [paySecondsLeft, product?.product_id, isWinnerFromProduct, isUnpaidWinner]);

  /* =========================================================================
     טעינת אפשרויות משלוח ודירוג מוכר
     ========================================================================= */
  useEffect(() => {
    async function loadSellerOption() {
      setLoadingOption(true);
      try {
        const { option, pickupAddressText, rating } = await getSellerDeliveryOptions(id);
        setSellerOption(option);
        setSellerPickupAddressText(option === "delivery+pickup" ? pickupAddressText || "" : "");
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

  /* =========================================================================
     טעינת רשומת sale עבור המוצר + בדיקת זכייה למשתמש
     ========================================================================= */
  useEffect(() => {
    async function loadSale() {
      try {
        if (!id) return;
        const res = await getAllSales();
        const list = res?.data || res || [];
        const prodSale = list.find((s) => String(s.product_id) === String(id));

        setSaleForProduct(prodSale || null);

        if (
          prodSale &&
          user?.id_number &&
          String(prodSale.buyer_id_number) === String(user.id_number)
        ) {
          setSaleInfo(prodSale); // המשתמש הוא הזוכה
        } else {
          setSaleInfo(null);
        }
      } catch (e) {
        console.error("טעינת sale נכשלה:", e);
        setSaleForProduct(null);
        setSaleInfo(null);
      }
    }
    loadSale();
  }, [id, user?.id_number]);

  /* =========================================================================
     בדיקת הרשמת המשתמש להצעות (quotation עם price=0)
     ========================================================================= */
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
  }, [product, user, id]);

  /* =========================================================================
     ספירה לאחור עד תחילת המכירה (start_date)
     ========================================================================= */
  useEffect(() => {
    if (!product?.start_date) {
      setStartCountdownSec(null);
      return;
    }

    const startMs = new Date(product.start_date).getTime();

    const tick = () => {
      const diffSec = Math.max(Math.floor((startMs - Date.now()) / 1000), 0);
      setStartCountdownSec(diffSec);
    };

    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [product?.start_date]);

  /* =========================================================================
     זרימת הרשמה: התחברות / אימות ת"ז / העלאת קובץ / רישום
     ========================================================================= */
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

  const completeRegistration = async (idNum) => {
    try {
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

      const dateStr = product?.start_date ? formatDate(product.start_date) : "";
      const timeStr = product?.start_date ? formatTime(product.start_date) : "";

      if (res.success) {
        setIsRegistered(true);
        setShowIdForm(false);
        openModal({
          title: "נרשמת!",
          message: dateStr
            ? `המכירה תחל בתאריך ${dateStr} בשעה ${timeStr}`
            : "נרשמת למכירה בהצלחה.",
          confirmText: "אישור",
          onCancel: () => setShowModal(false),
        });
      } else if (res.message === "כבר נרשמת למכירה הזו") {
        setIsRegistered(true);
        openModal({
          title: "כבר נרשמת!",
          message: dateStr
            ? `כבר נרשמת למכירה זו! המכירה תחל בתאריך ${dateStr} בשעה ${timeStr}`
            : "כבר נרשמת למכירה זו.",
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

  const handleRegisterToSale = useCallback(() => {
    // דרישת התחברות
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

    // דרישת ת״ז + צילום תעודה
    if (!user.id_number || !user.id_card_photo) {
      setShowIdForm(true);
      return;
    }

    // כבר יש ת״ז + צילום
    completeRegistration(user.id_number);
  }, [user, navigate]);

  // המשך הרשמה אוטומטי לאחר התחברות
  useEffect(() => {
    if (user && shouldContinueRegistration) {
      handleRegisterToSale();
      setShouldContinueRegistration(false);
    }
  }, [user, shouldContinueRegistration, handleRegisterToSale]);

  // קביעת זכייה לפי product.winner_id_number
  useEffect(() => {
    if (!product || !user?.id_number) {
      setIsWinnerFromProduct(false);
      return;
    }
    const winnerId = String(product.winner_id_number || "");
    setIsWinnerFromProduct(Boolean(winnerId && winnerId === String(user.id_number)));
  }, [product, user?.id_number]);

  // ניתוב אוטומטי למילוי כתובת אם הזוכה בחר משלוח ואין כתובת מלאה
  useEffect(() => {
    if (!product?.product_id || !isWinnerFromProduct || !saleInfo || didRedirectToShipping) return;

    const deliveryMethod = String(saleInfo.delivery_method || "").toLowerCase();
    if (deliveryMethod === "pickup") return;

    const hasAddress =
      !!saleInfo.city &&
      !!saleInfo.street &&
      !!String(saleInfo.house_number || "").trim() &&
      !!String(saleInfo.zip || "").trim();

    if (!hasAddress && deliveryMethod === "delivery") {
      setDidRedirectToShipping(true);
      navigate(`/shipping/${product.product_id}`);
    }
  }, [product?.product_id, isWinnerFromProduct, saleInfo, didRedirectToShipping, navigate]);

  /* ----- בדיקת unpaid ל̂זוכה (is_paid = 'no') ----- */
  useEffect(() => {
    let cancelled = false;

    async function checkUnpaidForWinner() {
      try {
        if (!product || !user?.id_number) {
          if (!cancelled) setIsUnpaidWinner(false);
          return;
        }

        const isWinner =
          String(product.winner_id_number || "") === String(user.id_number);
        if (!isWinner) {
          if (!cancelled) setIsUnpaidWinner(false);
          return;
        }

        const quotations = await getQuotationsByProductId(product.product_id);
        const q = quotations.find(
          (row) =>
            String(row.buyer_id_number) === String(user.id_number) &&
            (String(row.is_paid).toLowerCase() === "no" ||
              String(row.is_paid) === "0" ||
              row.is_paid === false)
        );

        if (!cancelled) setIsUnpaidWinner(!!q);
      } catch (e) {
        console.error("בדיקת is_paid נכשלה:", e);
        if (!cancelled) setIsUnpaidWinner(false);
      }
    }

    checkUnpaidForWinner();
    return () => {
      cancelled = true;
    };
  }, [product, user?.id_number]);

  /* ----- הצגת דדליין כתוב לזמן תשלום ----- */
  const lastBidMs = product?.last_bid_time ? new Date(product.last_bid_time).getTime() : null;
  const deadlineMs = lastBidMs ? lastBidMs + 24 * 60 * 60 * 1000 : null;
  const deadlineIso = deadlineMs ? new Date(deadlineMs).toISOString() : null;
  const deadlineText = deadlineIso ? formatDateTimeHe(deadlineIso) : "";

  /* ----- מעבר לתשלום (PayPal) ----- */
  const handleContinueToPayment = () => {
    const total = Number(saleInfo?.final_price ?? product?.current_price ?? 0);

    openModal({
      title: "🧾 פירוט המחיר",
      message: `המחיר הסופי הינו ₪${total}`,
      confirmText: "עבור לתשלום",
      onConfirm: async () => {
        try {
          const data = await createOrder(product.product_id);
          const approveUrl = data?.links?.find((l) => l.rel === "approve")?.href;
          if (approveUrl) {
            window.location.href = approveUrl;
          } else {
            alert("שגיאה בקבלת קישור לתשלום");
          }
        } catch (err) {
          console.error("שגיאה ביצירת בקשת תשלום:", err);
          alert("שגיאה ביצירת בקשת תשלום");
        }
      },
      onCancel: () => setShowModal(false),
    });
  };

  /* ----- שליחת טופס ת״ז + קובץ זיהוי ----- */
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

  /* ----- ביטול הרשמה להצעות ----- */
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

  /* =========================================================================
     חישובי מצב תצוגה
     ========================================================================= */

  // סיום לפי זמן: start_date + end_time
  const endedByTime = (() => {
    if (!product?.start_date || !product?.end_time) return false;
    const startMs = new Date(product.start_date).getTime();
    const durMs = parseDurationToMs(product.end_time);
    if (!Number.isFinite(startMs) || !durMs) return false;
    return Date.now() >= startMs + durMs;
  })();

  const hasSale = !!saleForProduct;      // האם קיימת רשומת sale
  const isWinner = isWinnerFromProduct;  // האם המשתמש הנוכחי הוא הזוכה
  const isEnded = hasSale || endedByTime; // המכרז הסתיים אם יש sale או פג הזמן

  const images = product?.images || [];

  /* =========================================================================
     תצוגות: טעינה / עריכת מנהל/מוכר / תצוגת קונים
     ========================================================================= */

  if (!product) return <p>טוען מוצר...</p>;

  const ProductEditor = require("../../components/productEditor/productEditor").default;
  const isAdmin = user?.role === "admin";
  const isOwner =
    user?.role === "seller" && String(user?.id_number) === String(product.seller_id_number);

  if (isAdmin || isOwner) {
    return (
      <ProductEditor
        productId={id}
        onSaved={() => window.history.back()}
        onCancel={() => window.history.back()}
      />
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        {/* גלריה (שמאל) */}
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
                  onClick={() =>
                    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
                  }
                  aria-label="תמונה קודמת"
                >
                  ‹
                </button>
                <span className={styles.imageIndex}>
                  {currentIndex + 1} / {images.length}
                </span>
                <button
                  className={styles.imageButton}
                  onClick={() => setCurrentIndex((prev) => (prev + 1) % images.length)}
                  aria-label="תמונה הבאה"
                >
                  ›
                </button>
              </div>
            </div>
          ) : (
            <p>אין תמונות זמינות</p>
          )}
        </div>

        {/* פרטי המוצר/מצב מכירה (ימין) */}
        <div className={styles.details}>
          {/* מצב זכייה */}
          {isWinner ? (
            <>
             {!isUnpaidWinner && <h1>ברכות! זכית במוצר</h1>}

              {/* פרטי הזמנה אם יש רשומת sale */}
              {saleInfo && <OrderDetails sale={saleInfo} />}

              {/* תשלום לזוכה שטרם שילם */}
              {isUnpaidWinner && (
                <>
                  {isPaymentWindowOpen ? (
                    <>
                      <p className={styles.notice}>
                        ניתן להשלים תשלום עד <b>{deadlineText}</b>
                        <br />
                        זמן שנותר: {formatCountdown(paySecondsLeft)}
                      </p>

                      <button
                        type="button"
                        className={styles.bidButton}
                        onClick={handleContinueToPayment}
                      >
                        המשך לתשלום
                      </button>
                    </>
                  ) : (
                    <p className={styles.error}>
                      חלפו 24 שעות מאז הזכייה ולא בוצע תשלום. ההזמנה בוטלה.
                    </p>
                  )}
                </>
              )}
            </>
          ) : isEnded ? (
            // המכרז הסתיים והמשתמש לא זכה
            <>
              <h1>{product.product_name}</h1>
              <p className={styles.notice}>המכרז הסתיים — לא זכית במכרז זה.</p>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  margin: "10px 0",
                  direction: "rtl",
                }}
              >
                <strong>דירוג מוכר:</strong>
                {renderStars(sellerRating)}
                <span>({sellerRating})</span>
              </div>
            </>
          ) : (
            // מכרז פתוח – תצוגת מוצר רגילה
            <>
              <h1>{product.product_name}</h1>
              <p className={styles.description}>{product.description}</p>
              <p className={styles.price}>מחיר פתיחה: ₪{product.price}</p>

              {/* אינפורמציית משלוח */}
              {!loadingOption && sellerOption === "delivery" && (
                <p className={styles.infoNote}>
                  מוצר זה ניתן <b>רק לשליחה</b>.
                </p>
              )}

              {!loadingOption && sellerOption === "delivery+pickup" && (
                <div className={styles.infoNote}>
                  מוצר זה ניתן <b>גם לשליחה וגם לאיסוף עצמי</b> מכתובת המוכר.
                  <div style={{ marginTop: 8 }}>
                    <button
                      type="button"
                      className={`${styles.linkLikeButton} ${
                        showPickup ? styles.linkLikeButtonActive : ""
                      }`}
                      onClick={() => setShowPickup((v) => !v)}
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

              {/* ספירה לאחור עד ההתחלה */}
              {startCountdownSec !== null && startCountdownSec > 0 && (
                <p className={styles.countdown}>
                  המכירה תחל בעוד {formatCountdown(startCountdownSec)}
                </p>
              )}
              {
                product?.is_live === "1" && product?.winner_id_number === null && (
                  <p className={styles.notice}>המכירה פעילה</p>
                )
              }

              {/* משך מכירה בדקות */}
              <p className={styles.status}>
                זמן המכירה למוצר זה הוא {durationToMinutesDisplay(product.end_time)} דקות
              </p>

              {/* הרשמה / ביטול / מעבר ללייב */}
              {isRegistered ? (
                <p className={styles.success}>נרשמת למכירה זו!</p>
              ) : (
                <button className={styles.bidButton} onClick={handleRegisterToSale}>
                  {user ? "הירשם/י למכירה" : "התחבר/י והירשם/י למכירה"}
                </button>
              )}

              {showIdForm && (
                <form onSubmit={handleIdSubmit} className={styles.idForm} dir="rtl">
                  <h3>נא להזין תעודת זהות ולצרף תמונה</h3>

                  <label>
                    מספר תעודת זהות:
                    <input
                      type="text"
                      value={idNumberInput}
                      onChange={(e) => setIdNumberInput(e.target.value)}
                      required
                    />
                  </label>

                  <label>
                    העלאת צילום תעודת זהות:
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => setIdPhotoFile(e.target.files[0])}
                      required
                    />
                  </label>

                  <button type="submit">שלח ואשר הרשמה</button>
                </form>
              )}

              {isRegistered && (
                <>
                  <button className={styles.cancelButton} onClick={handleCancelRegistration}>
                    הסרה מהמכרז
                  </button>

                  <button
                    className={styles.bidButton}
                    onClick={() => navigate(`/live-auction/${product.product_id}`)}
                  >
                    למעבר למכירה הפומבית לחץ כאן!
                  </button>
                </>
              )}

              {/* דירוג מוכר */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  margin: "10px 0",
                  direction: "rtl",
                }}
              >
                <strong>דירוג מוכר:</strong>
                {renderStars(sellerRating)}
                <span>({sellerRating})</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* תצוגת תמונה מוגדלת */}
      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
          <img
            src={`http://localhost:5000${images[currentIndex]}`}
            alt="תמונה מוגדלת"
            className={styles.modalImage}
          />
        </div>
      )}

      {/* מודאל כללי */}
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
          onClose={() => setShowModal(false)}
        />
      )}

      {/* פופ־אפ התחברות (LoginForm בתוך מודאל) */}
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
