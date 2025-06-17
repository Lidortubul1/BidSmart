import { useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { useNavigate } from "react-router-dom";
import { upgradeUserRole } from "../../services/authApi";
import styles from "./becomeSeller.module.css";
import CustomModal from "../../components/CustomModal/CustomModal";

function BecomeSellerPage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const [idNumber, setIdNumber] = useState("");
  const [idPhoto, setIdPhoto] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: "",
    message: "",
    confirmText: "סגור",
    onConfirm: () => setShowModal(false),
  });

  const openModal = ({ title, message }) => {
    setModalConfig({
      title,
      message,
      confirmText: "סגור",
      onConfirm: () => setShowModal(false),
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!idNumber || !idPhoto) {
      openModal({
        title: "שגיאה",
        message: "נא למלא תעודת זהות ולצרף קובץ",
      });
      return;
    }

    const formData = new FormData();
    formData.append("id_number", idNumber);
    formData.append("id_card_photo", idPhoto);
    formData.append("email", user.email);

    try {
      await upgradeUserRole(formData);


      const updatedUser = { ...user, role: "seller", id_number: idNumber };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));

      openModal({
        title: "הצלחה!",
        message: "הפכת למוכר! תועבר לדף הוספת מוצר",
      });

      setTimeout(() => {
        setShowModal(false);
        navigate("/add-product");
      }, 2000);
    } catch (err) {
      console.error("שגיאה:", err);
      openModal({
        title: "שגיאה",
        message: "שגיאה בעדכון. נסה שוב מאוחר יותר",
      });
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.formContainer}>
        <h1 className={styles.title}>הפוך למוכר</h1>
        <p className={styles.subtitle}>
          כדי להתחיל למכור פריטים, מלא את פרטיך:
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <label>
            תעודת זהות:
            <input
              type="text"
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              required
            />
          </label>

          <label>
            צילום תעודת זהות:
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setIdPhoto(e.target.files[0])}
              required
            />
          </label>

          <button type="submit">הפוך למוכר</button>
        </form>
      </div>

      {showModal && (
        <CustomModal
          title={modalConfig.title}
          message={modalConfig.message}
          confirmText={modalConfig.confirmText}
          onConfirm={modalConfig.onConfirm}
        />
      )}
    </div>
  );
}

export default BecomeSellerPage;
