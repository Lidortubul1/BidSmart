import ProductForm from "../../components/ProductForm/ProductForm";
import { useAuth } from "../../auth/AuthContext";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import styles from "./AddProductPage.module.css";
import { useState } from "react";
import CustomModal from "../../components/CustomModal/CustomModal";

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

      const payload = new FormData();

      for (const key in data) {
        if (key === "images" && data.images instanceof FileList) {
          Array.from(data.images).forEach((file) => {
            payload.append("images", file);
          });
        } else if (data[key]) {
          payload.append(key, data[key]);
        }
      }

      const response = await axios.post(
        "http://localhost:5000/api/product",
        payload,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      if (response.data.success) {
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
    <div className={styles.container}>
      <ProductForm onSubmit={handleProductSubmit} />
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
