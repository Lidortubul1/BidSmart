import { useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { useNavigate } from "react-router-dom";
import { addProduct } from "../../services/productApi";
import ProductForm from "../../components/ProductForm/ProductForm";
import CustomModal from "../../components/CustomModal/CustomModal";
import styles from "./AddProductPage.module.css";

function AddProductPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

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

  const openModal = ({ title, message, confirmText = "סגור", onConfirm }) => {
    setModalConfig({
      title,
      message,
      confirmText,
      onConfirm: () => {
        onConfirm?.();
        setShowModal(false);
      },
      onCancel: () => setShowModal(false),
    });
    setShowModal(true);
  };

  const handleProductSubmit = async (formData) => {
    try {
      const data = {
        ...formData,
        product_status: "for sale",
        seller_id_number: user.id_number,
      };

      const response = await addProduct(data);

      if (response && response.success) {
        openModal({
          title: "הצלחה!",
          message: "המוצר נוסף בהצלחה!",
          confirmText: "מעבר לדף הבית",
          onConfirm: () => navigate("/seller"),
        });
      } else {
        openModal({
          title: "שגיאה",
          message: response.data.message || "שגיאה בהוספת המוצר",
          confirmText: "סגור",
        });
      }
    } catch (error) {
      console.error("שגיאה:", error);
      const message =
        error.response?.data?.message || "שגיאה בעת שליחת המוצר לשרת";

      openModal({
        title: "שגיאת שרת",
        message: message,
        confirmText: "סגור",
      });
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.formBox}>
        <ProductForm onSubmit={handleProductSubmit} />
      </div>

      {showModal && (
        <CustomModal
          title={modalConfig.title}
          message={modalConfig.message}
          confirmText={modalConfig.confirmText}
          cancelText={modalConfig.cancelText}
          onConfirm={modalConfig.onConfirm}
          onCancel={modalConfig.onCancel}
          extraButtonText={modalConfig.extraButtonText}
          onExtra={modalConfig.onExtra}
        />
      )}
    </div>
  );
}

export default AddProductPage;
