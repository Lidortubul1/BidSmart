import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { getProductById } from "../../services/productApi";
import styles from "./ProductPage.module.css";
import CustomModal from "../../components/CustomModal/CustomModal";
import LoginForm from "../../components/LoginForm/LoginForm";
import {
  getQuotationsByProductId,
  registerToQuotation,
  cancelQuotationRegistration,
} from "../../services/quotationApi";
import { uploadIdCard } from "../../services/authApi";


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
  const [shouldContinueRegistration, setShouldContinueRegistration] =
    useState(false);

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

  tick(); // חישוב מיידי
  const iv = setInterval(tick, 1000);

  return () => clearInterval(iv);
}, [product?.start_date]);


  // useEffect הזה אחראי לבצע הרשמה למכירה מיד אחרי התחברות מוצלחת
  useEffect(() => {
    // אם המשתמש התחבר ויש דגל שאומר שצריך להמשיך את ההרשמה
    if (user && shouldContinueRegistration) {
      handleRegisterToSale(); // קורא לפונקציה שמבצעת את ההרשמה בפועל
      setShouldContinueRegistration(false); //כדי לא לקרוא שוב
    }
  }, [user, shouldContinueRegistration]);
  // מתבצע רק כשהמשתמש משתנה או ש־shouldContinueRegistration משתנה

  // useEffect הזה בודק האם המשתמש כבר רשום למכירה הזו (price === 0 בטבלת quotation)
  useEffect(() => {
    // אם אין עדיין מידע על המשתמש או על המוצר – אין מה לבדוק
    if (!user?.id_number || !product) return;

    // פונקציה פנימית א-סינכרונית שמבצעת את הבדיקה
    async function checkRegistration() {
      try {
        // שליפת כל ההצעות/הרשמות של המשתמש עבור המוצר הספציפי הזה
        const data = await getQuotationsByProductId(id);

        // בודק אם יש שורה בטבלה שמתאימה למשתמש הזה והמחיר שלה הוא 0 (כלומר הרשמה בלבד)
const alreadyRegistered = data.some(
  (q) => q.buyer_id_number === user.id_number && Number(q.price) === 0
);
setIsRegistered(alreadyRegistered);


        // אם כן – שומר את זה ב־isRegistered כדי לשנות את התצוגה באתר בהתאם
        setIsRegistered(alreadyRegistered);
      } catch {
        // אם הייתה שגיאה בשליפה – מציג מודאל עם הודעת שגיאה
        openModal({
          title: "שגיאה",
          message: "שגיאה בבדיקת הרשמה למכרז",
          confirmText: "סגור",
          onCancel: () => setShowModal(false),
        });
      }
    }

    checkRegistration(); // הפעלת הפונקציה בפועל
  }, [product, user]);
  // מתבצע רק כאשר המשתמש או המוצר משתנים

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

  const handleRegisterToSale = () => {
    // משתמש לא מחובר כלל (אין user או אין email)
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

    // המשתמש מחובר אבל חסרים לו ת"ז או צילום
    if (!user.id_number || !user.id_card_photo) {
      setShowIdForm(true);
      return;
    }

    // המשתמש מחובר ויש לו ת"ז + צילום
    completeRegistration(user.id_number);
  };

  //הרשמה למוצר
  const completeRegistration = async (idNum) => {
    try {
      const res = await registerToQuotation(product.product_id, idNum);
      console.log("Response:", res);

      const dateStr = formatDate(product.start_date);
      const timeStr = formatTime(product.start_date); 


      if (res.success) {
        setIsRegistered(true);
        setShowIdForm(false);
        openModal({
          title: "נרשמת!",
          message: `המכירה תחל בתאריך ${dateStr} בשעה ${timeStr}`,
          confirmText: "אישור",
          onCancel: () => setShowModal(false),
        });
      } else if (res.message === "כבר נרשמת למכירה הזו") {
        setIsRegistered(true);
        openModal({
          title: "כבר נרשמת!",
          message: `כבר נרשמת למכירה זו! המכירה תחל בתאריך ${dateStr} בשעה ${timeStr}`,
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
      // שליחה לשרת
      await uploadIdCard({
        idNumber: idNumberInput,
        idPhotoFile: idPhotoFile,
        email: user.email,
      });

      // עדכון ה־AuthContext עם המידע החדש
      setUser({
        ...user,
        id_number: idNumberInput,
        id_card_photo: "uploaded",
      });

      // סגירת הטופס
      setShowIdForm(false);

      //  מיד לאחר מכן — הרשמה להצעה
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

      setIsRegistered(false); //מעדכן
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

// עיצוב תאריך בלבד
const formatDate = (isoDate) => {
  const date = new Date(isoDate);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// עיצוב שעה בלבד
const formatTime = (isoDate) => {
  const date = new Date(isoDate);
  return date.toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
  });
};
const [startCountdownSec, setStartCountdownSec] = useState(null);

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
  const parts = timeStr.split(":").map(Number); // ["HH","MM","SS?"]
  const h = parts[0] || 0;
  const m = parts[1] || 0;
  return String(h * 60 + m);
}

// החזרת early לפני כל שימוש ב-product
if (!product) return <p>טוען מוצר...</p>;

// אל תגדיר const endTime = product.end_time; (מיותר)


  if (!product) return <p>טוען מוצר...</p>;
  const images = product.images || [];

  return (
    <div className={styles.page}>
      <div className={styles.content}>
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
                    setCurrentIndex(
                      (prev) => (prev - 1 + images.length) % images.length
                    )
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
                  onClick={() =>
                    setCurrentIndex((prev) => (prev + 1) % images.length)
                  }
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

        <div className={styles.details}>
          <h1>{product.product_name}</h1>
          <p className={styles.description}>{product.description}</p>
          <p className={styles.price}>מחיר פתיחה:  ₪{product.price}</p>
          <p className={styles.status}> {product.product_status} :סטטוס</p>
          {startCountdownSec !== null && startCountdownSec > 0 && (
  <p className={styles.countdown}>
    המכירה תחל בעוד {formatCountdown(startCountdownSec)}
  </p>
)}

          <p className={styles.status}> זמן מכירה: {timeToMinutes(product.end_time)} דקות</p>

{isRegistered ? (
  <p className={styles.success}>
    נרשמת למכירה זו!
  </p>
) : (
  <button className={styles.bidButton} onClick={handleRegisterToSale}>
    {user ? "הירשם/י למכירה" : "התחבר/י והירשם/י למכירה"}
  </button>
)}


          {showIdForm && (
            <form onSubmit={handleIdSubmit} className={styles.idForm}>
              <h3>נא להזין תעודת זהות וצרף תמונה</h3>
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

          {isRegistered && ( // יוצג רק אם רק אם isRegistered = true, כלומר המשתמש כבר רשום למכירה הזו
            <>
              <button
                className={styles.cancelButton}
                onClick={handleCancelRegistration}
              >
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
        </div>
      </div>

      {isModalOpen && (
        <div
          className={styles.modalOverlay}
          onClick={() => setIsModalOpen(false)}
        >
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
        />
      )}

      {showLoginPopup && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <LoginForm
              onSuccess={(userFromLogin) => {
                setUser(userFromLogin);
                setShowLoginPopup(false);
                setShowModal(false);
                setShouldContinueRegistration(true); //  זה יפעיל את useEffect למטה
              }}
            />
            <button
              className={styles.cancel}
              onClick={() => setShowLoginPopup(false)}
            >
              סגור
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductPage;
