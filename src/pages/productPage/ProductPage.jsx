// ProductPage.jsx
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import axios from "axios";
import styles from "./ProductPage.module.css";
import CustomModal from "../../components/CustomModal/CustomModal";
import LoginForm from "../../components/LoginForm/LoginForm";

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

  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: "",
    message: "",
    confirmText: "",
    cancelText: "",
    onConfirm: null,
    extraButtonText: "",
    onExtra: null,
  });

  useEffect(() => {
    async function fetchProduct() {
      try {
        const res = await axios.get("http://localhost:5000/api/product");
        const found = res.data.find((p) => p.product_id === parseInt(id));
        setProduct(found);
      } catch {
        openModal("שגיאה", "שגיאה בטעינת פרטי המוצר", "סגור");
      }
    }
    fetchProduct();
  }, [id]);

  useEffect(() => {
    if (!user?.id_number || !product) return;

    async function checkRegistration() {
      try {
        const res = await axios.get(
          `http://localhost:5000/api/quotation/${id}`
        );
        const alreadyRegistered = res.data.some(
          (q) => q.buyer_id_number === user.id_number && q.price === 0
        );
        setIsRegistered(alreadyRegistered);
      } catch {
        openModal("שגיאה", "שגיאה בבדיקת הרשמה למכרז", "סגור");
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
      onConfirm,
      cancelText,
      onCancel,
      extraButtonText,
      onExtra,
    });
    setShowModal(true);
  };
  

  const handleRegisterToSale = () => {
    if (!user?.id_number || !user?.role) {
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
        cancelText: "סגור",
        onCancel: () => setShowModal(false),
      });
      
      return;
    }

    if (!user.id_number || !user.id_card_photo) {
      setShowIdForm(true);
    } else {
      completeRegistration(user.id_number);
    }
  };

  const completeRegistration = async (idNum) => {
    try {
      const res = await axios.post("http://localhost:5000/api/quotation", {
        product_id: product.product_id,
        buyer_id_number: String(idNum),
        price: 0,
      });

      const dateStr = formatDate(product.start_date);
      const timeStr = product.start_time;

      if (res.data.success) {
        setIsRegistered(true);
        setShowIdForm(false);
        openModal(
          "נרשמת!",
          `המכירה תחל בתאריך ${dateStr} בשעה ${timeStr}`,
          "אישור"
        );
      }

      if (!res.data.success && res.data.message === "כבר נרשמת למכירה הזו") {
        setIsRegistered(true);
        openModal(
          "כבר נרשמת!",
          `כבר נרשמת למכירה זו! המכירה תחל בתאריך ${dateStr} בשעה ${timeStr}`,
          "הבנתי"
        );
      }
    } catch {
      openModal("שגיאה", "שגיאה בעת ניסיון הרשמה למכרז", "סגור");
    }
  };

  const handleIdSubmit = async (e) => {
    e.preventDefault();

    if (!idNumberInput || !idPhotoFile) {
      openModal("שגיאה", "נא להזין תעודת זהות ולצרף קובץ", "סגור");
      return;
    }

    const formData = new FormData();
    formData.append("id_number", idNumberInput);
    formData.append("id_card_photo", idPhotoFile);
    formData.append("email", user.email);

    try {
      await axios.put(
        "http://localhost:5000/api/auth/registerToQuotaion",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          withCredentials: true,
        }
      );

      setUser({ ...user, id_number: idNumberInput, id_card_photo: "uploaded" });
      setShowIdForm(false);
      completeRegistration(idNumberInput);
    } catch {
      openModal("שגיאה", "שגיאה בשמירת תעודת זהות", "סגור");
    }
  };

  const handleCancelRegistration = async () => {
    try {
      await axios.delete(
        `http://localhost:5000/api/quotation/${product.product_id}/${user.id_number}`
      );
      setIsRegistered(false);
      openModal("הוסרה ההרשמה", "הוסרת מהמכרז בהצלחה", "סגור");
    } catch {
      openModal("שגיאה", "שגיאה בהסרת ההשתתפות", "סגור");
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

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <div className={styles.imageWrapper}>
          <img
            src={product.image}
            alt={product.product_name}
            className={styles.image}
          />
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
            <button className={styles.bidButton} onClick={handleRegisterToSale}>
              התחבר/י והירשם/י למכירה
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
                onClick={() => navigate(`/live-auction/${product.product_id}`)}
              >
                למעבר למכירה הפומבית לחץ כאן!
              </button>
            </>
          )}
        </div>
      </div>

      {showModal && modalConfig.title && (
        <CustomModal
          title={modalConfig.title}
          message={modalConfig.message}
          confirmText={modalConfig.confirmText}
          cancelText={modalConfig.cancelText}
          onConfirm={modalConfig.onConfirm}
          extraButtonText={modalConfig.extraButtonText}
          onExtra={modalConfig.onExtra}
        />
      )}

      {showLoginPopup && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <LoginForm
              onSuccess={() => {
                console.log("המשתמש התחבר בהצלחה");
                setShowLoginPopup(false);
                setShowModal(false);
                handleRegisterToSale();
              }}
              onError={(msg) => openModal("שגיאה", msg, "סגור")}
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
