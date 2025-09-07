//src\pages\payment-success\payment-success.jsx
// דף אישור תשלום: בטעינה מאמת תשלום מול השרת (confirmPayment) לפי \:id מה־URL; בהצלחה מנווט ל־/shipping/\:id, ובכישלון מציג מודאל שגיאה עם כפתור חזרה לדף הבית (ניהול דרך useEffect + CustomModal).

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { confirmPayment } from "../../services/paymentApi";
import CustomModal from "../../components/CustomModal/CustomModal";

function PaymentSuccess() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [modalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState({
    title: "",
    message: "",
    confirmText: "",
    cancelText: "",
    onConfirm: null,
    onCancel: null,
  });

  const showModal = ({
    title,
    message,
    confirmText,
    cancelText,
    onConfirm,
    onCancel,
  }) => {
    setModalContent({
      title,
      message,
      confirmText,
      cancelText,
      onConfirm,
      onCancel,
    });
    setModalVisible(true);
  };

  useEffect(() => {
    async function finalizeSale() {
      const data = await confirmPayment(id);

      if (data.success) {
        navigate(`/shipping/${id}`);
      } else {
        showModal({
          title: "שגיאה",
          message: "אישור התשלום נכשל. נסה שוב מאוחר יותר.",
          confirmText: "חזור לדף הבית",
          onConfirm: () => {
            setModalVisible(false);
            navigate("/");
          },
        });
      }
    }

    if (id) {
      finalizeSale();
    } else {
      showModal({
        title: "שגיאה",
        message: "לא נמצא מזהה מוצר בכתובת ה-URL",
        confirmText: "חזרה לאתר",
        onConfirm: () => {
          setModalVisible(false);
          navigate("/");
        },
      });
    }
  }, [id, navigate]);

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h2> תודה על התשלום!</h2>
      <p>מעבד את ההזמנה שלך...</p>

      {modalVisible && (
        <CustomModal
          title={modalContent.title}
          message={modalContent.message}
          confirmText={modalContent.confirmText}
          cancelText={modalContent.cancelText}
          onConfirm={modalContent.onConfirm}
          onCancel={modalContent.onCancel || (() => setModalVisible(false))}
        />
      )}
    </div>
  );
}

export default PaymentSuccess;
