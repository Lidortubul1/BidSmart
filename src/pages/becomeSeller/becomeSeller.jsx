import { useState, useEffect } from "react"; // ← תוודא שמיובא

import { useAuth } from "../../auth/AuthContext";
import { useNavigate } from "react-router-dom";
import { upgradeUserRole } from "../../services/authApi";
import styles from "./becomeSeller.module.css";
import CustomModal from "../../components/CustomModal/CustomModal";

function BecomeSellerPage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const hasKyc = !!(user?.id_number && user?.id_card_photo); // ← חדש

  const [deliveryOption, setDeliveryOption] = useState("delivery"); // דיפולט: משלוח
  // שדות כתובת לחנות (רק כשיש איסוף עצמי)
  const [city, setCity] = useState("");
  const [street, setStreet] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [apartmentNumber, setApartmentNumber] = useState("");
  const [zip, setZip] = useState("");

  const [idNumber, setIdNumber] = useState("");

  const [phonePrefix, setPhonePrefix] = useState("050"); // קידומת ברירת מחדל
  const [phone7, setPhone7] = useState("");             // 7 ספרות

  const [idPhoto, setIdPhoto] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: "",
    message: "",
    confirmText: "סגור",
    onConfirm: () => setShowModal(false),
  });

  const openModal = ({ title, message }) => {
    setModalConfig({ title, message, confirmText: "סגור", onConfirm: () => setShowModal(false) });
    setShowModal(true);
  };

const handleSubmit = async (e) => {
  e.preventDefault();

  // ולידציה לטלפון – כאן, לא בגוף הקומפוננטה
  if (!/^\d{7}$/.test(phone7)) {
    openModal({ title: "שגיאה", message: "נא להזין מספר טלפון: 7 ספרות אחרי הקידומת" });
    return;
  }

  // אם אין KYC במערכת – חובה למלא ת"ז + צילום
  if (!hasKyc) {
    if (!idNumber || !idPhoto) {
      openModal({ title: "שגיאה", message: "נא למלא תעודת זהות ולצרף קובץ" });
      return;
    }
  }

  if (deliveryOption === "delivery+pickup") {
    if (!city || !street || !houseNumber || !apartmentNumber || !zip) {
      openModal({ title: "שגיאה", message: "נא למלא כתובת לחנות לאיסוף עצמי" });
      return;
    }
  }

  const formData = new FormData();
  const fullPhone = `${phonePrefix}${phone7}`;
  formData.append("email", user.email);
  formData.append("delivery_options", deliveryOption);
  formData.append("phone", fullPhone);

  if (!hasKyc) {
    formData.append("id_number", idNumber);
    formData.append("id_card_photo", idPhoto);
  }
  if (deliveryOption === "delivery+pickup") {
    formData.append("city", city);
    formData.append("street", street);
    formData.append("house_number", houseNumber);
    formData.append("apartment_number", apartmentNumber);
    formData.append("zip", zip);
    formData.append("country", "ישראל");
  }

  try {
  const { data } = await upgradeUserRole(formData);

 const updatedUser = data?.user ?? {
    ...user,
    role: "seller",
    delivery_options: deliveryOption,
    phone: `${phonePrefix}${phone7}`,
    ...(deliveryOption === "delivery+pickup" && {
      city, street, house_number: houseNumber, apartment_number: apartmentNumber, zip, country: "ישראל",
    }),
    ...(!hasKyc && { id_number: idNumber }),
  };

  setUser(updatedUser);
  localStorage.setItem("user", JSON.stringify(updatedUser));

  openModal({ title: "הצלחה!", message: "הפכת למוכר! תועבר לדף הוספת מוצר" });
  setTimeout(() => { setShowModal(false); navigate("/add-product"); }, 2000);
} catch (err) {
    console.error("שגיאה:", err);
    openModal({ title: "שגיאה", message: "שגיאה בעדכון. נסה שוב מאוחר יותר" });
  }
};


  // איפוס שדות הכתובת אם חזר ל-"delivery"
  const onChangeDelivery = (val) => {
    setDeliveryOption(val);
    if (val === "delivery") {
      setCity(""); setStreet(""); setHouseNumber(""); setApartmentNumber(""); setZip("");
    }
  };

  const isPhoneValid = /^\d{7}$/.test(phone7);

//אם כבר יש טלפון במערכת הוא יתמלא אוטומטית בשדה של הטלפון 

useEffect(() => {
  if (user?.phone) {
    const digits = String(user.phone).replace(/\D/g, ""); // ספרות בלבד
    if (digits.startsWith("972") && digits.length >= 11) {
      // מסיר את "972"
      const localPart = digits.slice(3); // לדוגמה "525563869"
      const prefix = "0" + localPart.slice(0, 2); // "052"
      const last7 = localPart.slice(-7); // "5563869"
      setPhonePrefix(prefix);
      setPhone7(last7);
    } else if (digits.length >= 10) {
      // מספר כבר בפורמט ישראלי מלא
      setPhonePrefix(digits.slice(0, 3)); // "050" או "052"
      setPhone7(digits.slice(-7));
    }
  }
}, [user?.phone]);


  return (
    <div className={styles.page}>
      <div className={styles.formBox}>
        <h1 className={styles.title}>הפוך למוכר</h1>
        <p className={styles.subtitle}>כדי להתחיל למכור פריטים, מלא את פרטיך:</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* ת"ז + צילום ת"ז רק אם אין KYC */}
          {!hasKyc && (
            <>
              <div className={styles.inputGroup}>
                <label>תעודת זהות:</label>
                <input
                  type="text"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  className={styles.input}
                />
              </div>

              <div className={styles.inputGroup}>
                <label>צילום תעודת זהות:</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setIdPhoto(e.target.files[0])}
                  className={styles.input}
                />
              </div>
            </>
          )}

          {/* טלפון */}
{/* טלפון */}
<div className={styles.inputGroup}>
  <label>טלפון נייד:</label>
  <div style={{ display: "flex", gap: "8px", direction: "ltr" }}>
    <select
      className={styles.input}
      value={phonePrefix}
      onChange={(e) => setPhonePrefix(e.target.value)}
    >
      <option value="050">050</option>
      <option value="051">051</option>
      <option value="052">052</option>
      <option value="053">053</option>
      <option value="054">054</option>
      <option value="055">055</option>
      <option value="056">056</option>
      <option value="057">057</option>
      <option value="058">058</option>
      <option value="059">059</option>
      <option value="072">072</option>
      <option value="073">073</option>
      <option value="074">074</option>
      <option value="076">076</option>
      <option value="077">077</option>
      <option value="079">079</option>
    </select>

    <input
      className={styles.input}
      type="text"
      inputMode="numeric"
      placeholder="7 ספרות"
      value={phone7}
      maxLength={7}
      onChange={(e) => {
        const v = e.target.value.replace(/\D/g, "");
        if (v.length <= 7) setPhone7(v);
      }}
    />
  </div>
</div>
    <p>*מספר הטלפון שתמלא יהיה גלוי למי שזכה במכרזים של מוצרייך</p>



          {/* אפשרויות משלוח */}
          <div className={styles.inputGroup}>
            <label>אפשרויות משלוח למוכר:</label>
            <select
              value={deliveryOption}
              onChange={(e) => onChangeDelivery(e.target.value)}
              className={styles.input}
            >
              <option value="delivery">משלוח</option>
              <option value="delivery+pickup">משלוח + איסוף עצמי</option>
            </select>
            
          </div>

          {/* טופס כתובת – רק כשיש איסוף עצמי */}
          {deliveryOption === "delivery+pickup" && (
            <>
            <p>*הכתובת שתבחר תתעדכן בפרופיל שלך והקונים יראו אותה במודעות שלך</p>
              <div className={styles.inputGroup}>
                <label>עיר:</label>
                <input className={styles.input} value={city} onChange={(e)=>setCity(e.target.value)} />
              </div>
              <div className={styles.inputGroup}>
                <label>רחוב:</label>
                <input className={styles.input} value={street} onChange={(e)=>setStreet(e.target.value)} />
              </div>
              <div className={styles.inputGroup}>
                <label>מס' בית:</label>
                <input className={styles.input} value={houseNumber} onChange={(e)=>setHouseNumber(e.target.value)} />
              </div>
              <div className={styles.inputGroup}>
                <label>מס' דירה:</label>
                <input className={styles.input} value={apartmentNumber} onChange={(e)=>setApartmentNumber(e.target.value)} />
              </div>
              <div className={styles.inputGroup}>
                <label>מיקוד:</label>
                <input className={styles.input} value={zip} onChange={(e)=>setZip(e.target.value)} />
              </div>
              {/* מדינה לא מוצגת – נשלח "ישראל" אוטומטית */}
            </>
          )}

<button type="submit" className={styles.button} disabled={!isPhoneValid}>
  הפוך למוכר
</button>
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
