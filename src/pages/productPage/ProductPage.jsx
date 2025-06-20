  import { useParams, useNavigate } from "react-router-dom";
  import { useEffect, useState } from "react";
  import { useAuth } from "../../auth/AuthContext";
  import { getProductById } from "../../services/productApi";
  import axios from "axios";
  import styles from "./ProductPage.module.css";
  import CustomModal from "../../components/CustomModal/CustomModal";
  import LoginForm from "../../components/LoginForm/LoginForm";
  import {
    getQuotationsByProductId,
    registerToQuotation,
    cancelQuotationRegistration,} from "../../services/quotationApi";
  import {uploadIdCard} from "../../services/authApi"
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
    const [shouldContinueRegistration, setShouldContinueRegistration] =useState(false);

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
      if (user && shouldContinueRegistration) {
        handleRegisterToSale();
        setShouldContinueRegistration(false); // כדי לא לקרוא שוב בטעות
      }
    }, [user, shouldContinueRegistration]);

    useEffect(() => {
      if (!user?.id_number || !product) return;

      async function checkRegistration() {
        try {
          const data = await getQuotationsByProductId(id);
          const alreadyRegistered = data.some(
            (q) => q.buyer_id_number === user.id_number && q.price === 0
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
    }, [product, user]);

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
        const timeStr = product.start_time;

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
        setUser({ ...user, id_number: idNumberInput, id_card_photo: "uploaded" });

        // סגירת הטופס
        setShowIdForm(false);

        // 👇 מיד לאחר מכן — הרשמה להצעה
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

    const formatDate = (isoDate) => {
      const date = new Date(isoDate);
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };

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
                <div className={styles.controls}>
                  <button
                    onClick={() =>
                      setCurrentIndex(
                        (prev) => (prev - 1 + images.length) % images.length
                      )
                    }
                  >
                    ⬅️
                  </button>
                  <span>
                    {currentIndex + 1} מתוך {images.length}
                  </span>
                  <button
                    onClick={() =>
                      setCurrentIndex((prev) => (prev + 1) % images.length)
                    }
                  >
                    ➡️
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
            <p className={styles.price}>מחיר פתיחה: {product.price} ₪</p>
            <p className={styles.status}>סטטוס: {product.product_status}</p>

            {isRegistered ? (
              <p className={styles.success}>
                נרשמת למכירה זו! <br />
                המכירה תחל בתאריך: {formatDate(product.start_date)} בשעה:{" "}
                {product.start_time}
              </p>
            ) : (
              <button
                className={styles.bidButton}
                onClick={handleRegisterToSale}
              >
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

            {isRegistered && (
              <>
                <button
                  className={styles.cancelButton}
                  onClick={handleCancelRegistration}
                >
                  הסרה מהמכרז
                </button>
                <button
                  className={styles.bidButton}
                  onClick={() =>
                    navigate(`/live-auction/${product.product_id}`)
                  }
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
                  setShouldContinueRegistration(true); // ← זה יפעיל את useEffect למטה
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
