import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import citiesData from "../../assets/data/cities_with_streets.json";
import CustomModal from "../../components/CustomModal/CustomModal.jsx";
import styles from "./ShippingForm.module.css";

function ShippingForm() {
  const { id } = useParams(); // מזהה המוצר
  const navigate = useNavigate();

  const [selectedCity, setSelectedCity] = useState("");
  const [availableStreets, setAvailableStreets] = useState([]);

  // טופס
  const [formData, setFormData] = useState({
    city: "",
    street: "",
    house_number: "",
    apartment_number: "",
    zip: "",
  });

  // מודאל קופץ
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

  // שינוי עיר
  const handleCityChange = (e) => {
    const selected = e.target.value;
    setSelectedCity(selected);
    const cityObj = citiesData.find((c) => c.city === selected);
    setAvailableStreets(cityObj ? cityObj.streets : []);
    setFormData({ ...formData, city: selected, street: "" });
  };

  // שינוי שדות רגילים
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // שליחת כתובת ידנית
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:5000/api/sale/update-address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: id, ...formData }),
      });
      const data = await res.json();

      if (data.success) {
        showModal({
          title: "כתובת נשלחה",
          message: "הכתובת שלך נשלחה למוכר בהצלחה!",
          confirmText: "חזרה לדף הבית",
          onConfirm: () => navigate("/"),
        });
      } else {
        showModal({
          title: "שגיאה",
          message: data.message || "אירעה שגיאה בשליחת הכתובת.",
          confirmText: "סגור",
          onConfirm: () => setModalVisible(false),
        });
      }
    } catch (err) {
      showModal({
        title: "שגיאת רשת",
        message: "לא ניתן לשלוח את הכתובת לשרת.",
        confirmText: "סגור",
        onConfirm: () => setModalVisible(false),
      });
    }
  };

  // שליחת כתובת מגורים קיימת
  const handleUseSavedAddress = () => {
    showModal({
      title: "משלוח לכתובת מגורים",
      message: "האם לשלוח את המוצר לכתובת המגורים שלך?",
      confirmText: "כן, שלח",
      cancelText: "לא",
      onConfirm: async () => {
        setModalVisible(false);
        try {
          const res = await fetch("http://localhost:5000/api/sale/use-saved-address",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ product_id: id }),
            }
          );
          const data = await res.json();
          if (data.success) {
            showModal({
              title: "בוצע בהצלחה",
              message: "כתובת המגורים שלך עודכנה במערכת.",
              confirmText: "מעבר לדף הבית",
              onConfirm: () => navigate("/"),
            });
          } else {
            showModal({
              title: "שגיאה",
              message: data.message || "לא נמצאה כתובת מגורים מלאה.",
              confirmText: "סגור",
              onConfirm: () => setModalVisible(false),
            });
          }
        } catch (err) {
          showModal({
            title: "שגיאת רשת",
            message: "לא ניתן לשלוח את הכתובת לשרת.",
            confirmText: "סגור",
            onConfirm: () => setModalVisible(false),
          });
        }
      },
      onCancel: () => setModalVisible(false),
    });
  };

  return (
    <div className={styles.container}>
      <h3>נא למלא כתובת למשלוח</h3>

      <button
        className={styles.useSavedBtn}
        type="button"
        onClick={handleUseSavedAddress}>
        השתמש בכתובת המגורים שלי
      </button>

      <form onSubmit={handleSubmit} className={styles.form}>
        <select
          name="city"
          value={formData.city}
          onChange={handleCityChange}
          required>
            
          <option value="">בחר עיר</option>
          {citiesData.map((c, i) => (
            <option key={i} value={c.city}>
              {c.city}
            </option>
          ))}
        </select>

        <select
          name="street"
          value={formData.street}
          onChange={handleChange}
          required
        >
          <option value="">בחר רחוב</option>
          {availableStreets.map((s, i) => (
            <option key={i} value={s}>
              {s}
            </option>
          ))}
        </select>

        <input
          name="house_number"
          placeholder="מספר בית"
          value={formData.house_number}
          onChange={handleChange}
          required
        />

        <input
          name="apartment_number"
          placeholder="מספר דירה"
          value={formData.apartment_number}
          onChange={handleChange}
          required
        />

        <input
          name="zip"
          placeholder="מיקוד"
          value={formData.zip}
          onChange={handleChange}
          required
        />

        <button className={styles.submitBtn} type="submit">
          שלח כתובת
        </button>
      </form>

      {modalVisible && (
        <CustomModal
          title={modalContent.title}
          message={modalContent.message}
          confirmText={modalContent.confirmText}
          cancelText={modalContent.cancelText}
          onConfirm={modalContent.onConfirm}
          onCancel={modalContent.onCancel}
        />
      )}
    </div>
  );
}

export default ShippingForm;
