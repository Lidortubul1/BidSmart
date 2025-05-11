import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import axios from "axios";
import styles from "./ProductPage.module.css";
import Modal from "react-bootstrap/Modal";
import LoginPage from "../login/LoginPage";
import RegisterPage from "../register/RegisterPage";

function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [product, setProduct] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);

  const [showChoiceModal, setShowChoiceModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

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

    async function checkRegistration() {
      if (!user?.id_number) return;
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

    fetchProduct();
    if (user) checkRegistration();
  }, [id, user?.id_number]);

  const handleRegisterToSale = async () => {
    if (!user) {
      setShowChoiceModal(true);
      return;
    }

    if (!user.id_number) {
      alert("כדי להירשם למכירה יש להשלים תעודת זהות");
      navigate("/become-seller");
      return;
    }

    try {
      const res = await axios.post("http://localhost:5000/api/quotation", {
        product_id: product.product_id,
        buyer_id_number: user.id_number,
        price: 0,
      });

      if (res.data.success) {
        alert("נרשמת בהצלחה למכירה");
        setIsRegistered(true);
      } else {
        alert(res.data.message || "שגיאה בהרשמה");
      }
    } catch (err) {
      console.error("שגיאה בשרת:", err);
      alert("שגיאה בשרת");
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

          {!isRegistered ? (
            <button className={styles.bidButton} onClick={handleRegisterToSale}>
              לחץ להרשמה למכירה
            </button>
          ) : (
            <p className={styles.registeredMessage}>כבר נרשמת למכירה הזאת</p>
          )}
        </div>
      </div>

      {/* חלון בחירה התחברות/הרשמה */}
      <Modal
        show={showChoiceModal}
        onHide={() => setShowChoiceModal(false)}
        centered
      >
        <Modal.Body style={{ textAlign: "center" }}>
          <h4>כדי להירשם למכירה יש להתחבר או להירשם</h4>
          <div
            style={{
              display: "flex",
              justifyContent: "space-around",
              marginTop: 20,
            }}
          >
            <button
              onClick={() => {
                setShowChoiceModal(false);
                setShowLoginModal(true);
              }}
            >
              התחברות
            </button>
            <button
              onClick={() => {
                setShowChoiceModal(false);
                setShowRegisterModal(true);
              }}
            >
              הרשמה
            </button>
          </div>
        </Modal.Body>
      </Modal>

      {/* חלון התחברות */}
      <Modal
        show={showLoginModal}
        onHide={() => setShowLoginModal(false)}
        centered
      >
        <Modal.Body>
          <LoginPage isModal={true} redirectAfterLogin={`/product/${id}`} />
        </Modal.Body>
      </Modal>

      {/* חלון הרשמה */}
      <Modal
        show={showRegisterModal}
        onHide={() => setShowRegisterModal(false)}
        centered
      >
        <Modal.Body>
          <RegisterPage
            isModal={true}
            redirectAfterRegister={`/product/${id}`}
          />
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default ProductPage;
