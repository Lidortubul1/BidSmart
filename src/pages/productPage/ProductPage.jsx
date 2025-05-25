import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import axios from "axios";
import styles from "./ProductPage.module.css";

function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, setUser } = useAuth();

  const [product, setProduct] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [idNumberInput, setIdNumberInput] = useState("");
  const [idPhotoFile, setIdPhotoFile] = useState(null);
  const [showIdForm, setShowIdForm] = useState(false);

  const [timeUntilStart, setTimeUntilStart] = useState(null);


  useEffect(() => {
    if (product?.is_live === 1 && isRegistered) {
      navigate(`/live-auction/${product.product_id}`);
    }
  }, [product, isRegistered]);
  


  useEffect(() => {
    async function fetchProduct() {
      try {
        const response = await axios.get("http://localhost:5000/api/product");
        const found = response.data.find((p) => p.product_id === parseInt(id));
        setProduct(found);
      } catch (err) {
        console.error("שגיאה בטעינת מוצר:", err);
      }
    }
    fetchProduct();
  }, [id]);

  useEffect(() => {
    if (!product || product.is_live !== 0) return;

    const now = new Date();
    const startTime = new Date(product.start_date);
    const diffMs = startTime - now;

    if (diffMs > 0) {
      const seconds = Math.floor(diffMs / 1000);
      setTimeUntilStart(seconds);
    }
  }, [product]);

  useEffect(() => {
    async function checkRegistration() {
      if (!user?.id_number || !product) return;
      try {
        const res = await axios.get(
          `http://localhost:5000/api/quotation/${id}`
        );
        const alreadyRegistered = res.data.some(
          (q) => q.buyer_id_number === user.id_number && q.price === 0
        );
        setIsRegistered(alreadyRegistered);
      } catch (err) {
        console.error("שגיאה בבדיקת הרשמה:", err);
      }
    }

    checkRegistration();
  }, [user, product, id]);

  useEffect(() => {
    if (!timeUntilStart || timeUntilStart <= 0) return;

    const interval = setInterval(() => {
      setTimeUntilStart((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [timeUntilStart]);

  const formatTime = (seconds) => {
    const hrs = String(Math.floor(seconds / 3600)).padStart(2, "0");
    const mins = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
    const secs = String(seconds % 60).padStart(2, "0");
    return `${hrs}:${mins}:${secs}`;
  };

  const formatDate = (isoDate) => {
    const date = new Date(isoDate);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleRegisterToSale = () => {
    if (!user) {
      navigate("/login");
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
      
      // אם הצליח או כבר היה רשום – נסמן כ־רשום
      if (res.data.success || res.data.message === "כבר נרשמת למכירה הזו") {
        setIsRegistered(true);
        setShowIdForm(false);
      }
    } catch (err) {
      console.error("שגיאה בהרשמה:", err.response?.data || err.message);
      // נוסיף fallback – גם אם קיבלנו שגיאה 400 כי כבר רשום
      if (err.response?.data?.message === "כבר נרשמת למכירה הזו") {
        setIsRegistered(true);
        setShowIdForm(false);
      }
    }
  };
  

  const handleIdSubmit = async (e) => {
    e.preventDefault();

    if (!idNumberInput || !idPhotoFile) {
      alert("נא למלא מספר תעודת זהות ולצרף קובץ");
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

      const updatedUser = {
        ...user,
        id_number: idNumberInput,
        id_card_photo: "uploaded",
      };
      setUser(updatedUser);
      setShowIdForm(false);
      completeRegistration(idNumberInput);
    } catch (err) {
      console.error("שגיאה בשמירת תעודת זהות:", err);
    }
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
              המכירה תחל בתאריך: {formatDate(product.start_date)}
            </p>
          ) : (
            <button className={styles.bidButton} onClick={handleRegisterToSale}>
              לחץ להרשמה למכירה
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

          {product.is_live === 1 && isRegistered && (
            <button
              className={styles.bidButton}
              onClick={() => navigate(`/live-auction/${product.product_id}`)}
            >
              הצטרף למכירה הפומבית
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductPage;
