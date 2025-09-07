//src\pages\AddProductPage\AddProductPage.jsx
// עמוד הוספת מוצר (מוכר בלבד): מציג טופס ProductForm, מרכיב payload (כולל seller_id_number ו-product_status='for sale'),
// שולח ל־addProduct, ומציג מודאל הצלחה/שגיאה עם ניתוב חזרה ללוח המוכר.

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

  // פונקציה שמטפלת בשליחת טופס הוספת מוצר לשרת
  const handleProductSubmit = async (formData) => {
    try {
      // מוסיפים לשדות שהוזנו בטופס גם סטטוס קבוע של המוצר וגם את מזהה המוכר מתוך הקונטקסט
      const data = {
        ...formData, // כולל שם, תאריכים, תמונות, תיאור וכו'
        product_status: "for sale", // המוצר נכנס למכירה
        seller_id_number: user.id_number, // מזהה המוכר המחובר
      };

      // שולחים את כל המידע לשרת דרך הפונקציה addProduct (נמצאת בקובץ productApi.js)
      const response = await addProduct(data);

      // אם הצליח – כלומר השרת החזיר success = true
      if (response && response.success) {
        // מציגים מודאל עם הודעת הצלחה וכפתור שיפנה לעמוד הבית של הספק
        openModal({
          title: "הצלחה!",
          message: "המוצר נוסף בהצלחה!",
          confirmText: "מעבר לדף הבית",
          onConfirm: () => navigate("/seller"), // ניווט לעמוד הבית של המוכר
        });
      } else {
        // אם התשובה מהשרת לא הצליחה – מציגים מודאל עם הודעת שגיאה
        openModal({
          title: "שגיאה",
          message: response.message || "שגיאה בהוספת המוצר", // אם יש הודעת שגיאה מהשרת מציגים אותה, אחרת הודעה כללית
          confirmText: "סגור",
        });
      }
    } catch (error) {
      // במקרה של שגיאה בתקשורת עם השרת (לא קיבלנו תשובה תקינה)
      console.error("שגיאה:", error);
      const message =
        error.response?.data?.message || "שגיאה בעת שליחת המוצר לשרת";

      // מציגים מודאל עם הודעת שגיאה כללית על תקלה בתקשורת
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
