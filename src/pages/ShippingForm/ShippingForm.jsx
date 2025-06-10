import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import citiesData from "../../assets/data/cities_with_streets.json";
import CustomModal from "../../components/CustomModal/CustomModal.jsx";
import styles from "./ShippingForm.module.css";
import { useAuth } from "../../auth/AuthContext.js"


function ShippingForm() {
  const { user } = useAuth();
  const { id } = useParams(); // מזהה המוצר
  const navigate = useNavigate();

  const [selectedCity, setSelectedCity] = useState("");
  const [availableStreets, setAvailableStreets] = useState([]);
  //שיטת משלוח
  const [deliveryMethod, setDeliveryMethod] = useState(""); // "delivery" או "pickup"

  // טופס
  const [formData, setFormData] = useState({
    city: "",
    street: "",
    house_number: "",
    apartment_number: "",
    zip: "",
    notes: "", // 🆕 הערות למוכר
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
      if (deliveryMethod === "pickup") {
        delete formData.city;
        delete formData.street;
        delete formData.house_number;
        delete formData.apartment_number;
        delete formData.zip;
      }      
      // קודם כל שולח את הכתובת לטבלת sale בלבד
      const res = await fetch(
        "http://localhost:5000/api/sale/update-sale-address",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product_id: id, delivery_method: deliveryMethod, ...formData })
        }
      );

      const data = await res.json();

      if (!data.success) {
        return showModal({
          title: "שגיאה",
          message: data.message || "אירעה שגיאה בשליחת הכתובת.",
          confirmText: "סגור",
          onConfirm: () => setModalVisible(false),
        });
      }

      // חלון קופץ עם הודעה מותאמת בהתאם לבחירת משלוח
      if (deliveryMethod === "delivery") {
        showModal({
          title: "שמירת כתובת",
          message: "האם ברצונך לשמור כתובת זו גם בפרופיל שלך לשימוש עתידי?",
          confirmText: "כן, שמור",
          cancelText: "לא, המשך",
          onConfirm: async () => {
            setModalVisible(false);

            // שליחת עדכון לטבלת users
            try {
              const userRes = await fetch(
                "http://localhost:5000/api/sale/update-user-address",
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ product_id: id, ...formData }),
                }
              );
              const userData = await userRes.json();

              if (!userData.success) {
                return showModal({
                  title: "שגיאה",
                  message: userData.message || "הכתובת לא נשמרה בפרופיל.",
                  confirmText: "סגור",
                  onConfirm: () => setModalVisible(false),
                });
              }

              showModal({
                title: "הצלחה",
                message: "הכתובת נשמרה גם בפרופיל שלך!",
                confirmText: "חזרה לדף הבית",
                onConfirm: () => navigate(user.role === "seller" ? "/seller" : "/buyer")
              });
            } catch (err) {
              showModal({
                title: "שגיאה",
                message: "לא ניתן לשמור את הכתובת בפרופיל.",
                confirmText: "סגור",
                onConfirm: () => setModalVisible(false),
              });
            }
          },
          onCancel: () =>
            showModal({
              title: "כתובת נשלחה",
              message: "הכתובת נשלחה רק לטובת המשלוח.",
              confirmText: "חזרה לדף הבית",
              onConfirm: () => navigate(user.role === "seller" ? "/seller" : "/buyer"),
            }),
        });
      } else {
        // אם בחר איסוף עצמי – פשוט הפנייה לדף הבית
        showModal({
          title: "איסוף עצמי",
          message: "בחירתך נקלטה בהצלחה. יש ליצור קשר עם המוכר לתיאום.",
          confirmText: "חזרה לדף הבית",
          onConfirm: () => navigate(user.role === "seller" ? "/seller" : "/buyer"),
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
  const handleUseSavedAddress = async () => {
    try {
      const res = await fetch(
        "http://localhost:5000/api/sale/get-user-address", // ✅ נתיב חדש
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product_id: id }),
        }
      );
      const data = await res.json();
      if (data.success && data.address) {
        const { city, street, house_number, apartment_number, zip } =
          data.address;
        setFormData((prev) => ({
          ...prev,
          city,
          street,
          house_number,
          apartment_number,
          zip,
        }));
        setSelectedCity(city);
        const cityObj = citiesData.find((c) => c.city === city);
        setAvailableStreets(cityObj ? cityObj.streets : []);
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
        message: "לא ניתן לשלוף את כתובת המגורים.",
        confirmText: "סגור",
        onConfirm: () => setModalVisible(false),
      });
    }
  };
  

  return (
    <div className={styles.container}>
      <div className={styles.deliveryOptions}>
        <label>
          <input
            type="radio"
            name="delivery_method"
            value="delivery"
            checked={deliveryMethod === "delivery"}
            onChange={() => setDeliveryMethod("delivery")}
            required
          />
          משלוח עד הבית
        </label>
        <label>
          <input
            type="radio"
            name="delivery_method"
            value="pickup"
            checked={deliveryMethod === "pickup"}
            onChange={() => setDeliveryMethod("pickup")}
          />
          איסוף עצמי
        </label>
      </div>

      {deliveryMethod === "delivery" && <h3>נא למלא כתובת למשלוח</h3>}
      {deliveryMethod === "delivery" && (
        <button
          className={styles.useSavedBtn}
          type="button"
          onClick={handleUseSavedAddress}
        >
          השתמש בכתובת המגורים שלי
        </button>
      )}
      <form onSubmit={handleSubmit} className={styles.form}>
        {deliveryMethod === "delivery" && (
          <>
            <select
              name="city"
              value={formData.city}
              onChange={handleCityChange}
              required
            >
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
          </>
        )}
        <textarea
          name="notes"
          placeholder="הערות למוכר (לא חובה)"
          value={formData.notes}
          onChange={handleChange}
        />

        <button className={styles.submitBtn} type="submit">
          שלח למוכר
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
