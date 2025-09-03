import { useState, useEffect } from "react";
import { useAuth } from "../../auth/AuthContext";
import { useNavigate } from "react-router-dom";
import { upgradeUserRole } from "../../services/authApi";
import styles from "./becomeSeller.module.css";
import CustomModal from "../../components/CustomModal/CustomModal";
import citiesData from "../../assets/data/cities_with_streets.json"; // ⬅️ חדש


// מפענח טלפון לפורמט prefix:+9725X  ו-number: 7 ספרות
function parseIlMobile(raw) {
  if (!raw) return null;
  let digits = String(raw).replace(/\D/g, "");

  // 9725XYYYYYYY
  if (digits.length === 12 && digits.startsWith("9725")) {
    const x = digits[4];
    const tail = digits.slice(-7);
    return { prefix: `+9725${x}`, number: tail };
  }
  // 05XYYYYYYY
  if (digits.length === 10 && digits.startsWith("05")) {
    const x = digits[2];
    const tail = digits.slice(-7);
    return { prefix: `+9725${x}`, number: tail };
  }
  // 5XYYYYYYY
  if (digits.length === 9 && digits.startsWith("5")) {
    const x = digits[1];
    const tail = digits.slice(-7);
    return { prefix: `+9725${x}`, number: tail };
  }

  // עם פלוס במקור
  const withPlus = String(raw).replace(/\s|-/g, "");
  const m = withPlus.match(/^\+9725(\d)(\d{7})$/);
  if (m) {
    return { prefix: `+9725${m[1]}`, number: m[2] };
  }
  return null;
}

function BecomeSellerPage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const hasKyc = !!(user?.id_number && user?.id_card_photo);

  const [deliveryOption, setDeliveryOption] = useState("delivery");

  // עיר/רחוב מתוך DATA (במקום טקסט חופשי)
  const [selectedCity, setSelectedCity] = useState("");
  const [availableStreets, setAvailableStreets] = useState([]);
  const [selectedStreet, setSelectedStreet] = useState("");
  const [cityTouched, setCityTouched] = useState(false);
const [idErrMsg, setIdErrMsg] = useState("");

  const [houseNumber, setHouseNumber] = useState("");
  const [apartmentNumber, setApartmentNumber] = useState("");
  const [zip, setZip] = useState("");

  const [idNumber, setIdNumber] = useState("");

 const [phonePrefix, setPhonePrefix] = useState("+97250"); // היה "050"
const [phone7, setPhone7] = useState("");


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

// מילוי טלפון מה־user אם קיים (כולל קידומת בפורמט +9725X)
useEffect(() => {
  if (user?.phone) {
    const parsed = parseIlMobile(user.phone);
    if (parsed) {
      setPhonePrefix(parsed.prefix); // למשל "+97252"
      setPhone7(parsed.number);      // 7 ספרות אחרונות
    }
  }
}, [user?.phone]);


  // מילוי עיר/רחוב קיימים מה־user (אם יש)
  useEffect(() => {
    if (user?.city) {
      setSelectedCity(user.city);
      const found = citiesData.find((c) => c.city === user.city);
      setAvailableStreets(found ? found.streets : []);
    }
    if (user?.street) setSelectedStreet(user.street);
    if (user?.zip) setZip(user.zip);
    if (user?.house_number) setHouseNumber(user.house_number);
    if (user?.apartment_number) setApartmentNumber(user.apartment_number);
  }, [user]);

  const onChangeDelivery = (val) => {
    setDeliveryOption(val);
    if (val === "delivery") {
      // איפוס פרטי כתובת כשחוזרים רק למשלוח
      setSelectedCity("");
      setAvailableStreets([]);
      setSelectedStreet("");
      setHouseNumber("");
      setApartmentNumber("");
      setZip("");
      setCityTouched(false);
    }
  };

  const handleCityChange = (e) => {
    const city = e.target.value;
    setSelectedCity(city);
    setCityTouched(true);
    const found = citiesData.find((c) => c.city === city);
    setAvailableStreets(found ? found.streets : []);
    setSelectedStreet("");
  };

  const isPhoneValid = /^\d{7}$/.test(phone7);

const handleSubmit = async (e) => {
  e.preventDefault();

  if (!isPhoneValid) {
    openModal({ title: "שגיאה", message: "נא להזין מספר טלפון: 7 ספרות אחרי הקידומת" });
    return;
  }

if (!hasKyc) {
  if (!/^\d{9}$/.test(idNumber)) {
    setIdErrMsg("מספר תעודת זהות חייב להיות בן 9 ספרות");
    return;
  }
  if (!idPhoto) {
    openModal({ title: "שגיאה", message: "נא לצרף צילום תעודת זהות" });
    return;
  }
}



    // אם יש איסוף עצמי – חובה עיר/רחוב מתוך הרשימה + שאר הכתובת
    if (deliveryOption === "delivery+pickup") {
      if (!selectedCity || !selectedStreet || !houseNumber || !apartmentNumber || !zip) {
        openModal({ title: "שגיאה", message: "נא למלא כתובת חנות לאיסוף עצמי" });
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
      formData.append("city", selectedCity);
      formData.append("street", selectedStreet);
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
        phone: fullPhone,
        ...(deliveryOption === "delivery+pickup" && {
          city: selectedCity,
          street: selectedStreet,
          house_number: houseNumber,
          apartment_number: apartmentNumber,
          zip,
          country: "ישראל",
        }),
        ...(!hasKyc && { id_number: idNumber }),
      };

      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));

      openModal({ title: "הצלחה!", message: "הפכת למוכר! תועבר לדף הוספת מוצר" });
      setTimeout(() => {
        setShowModal(false);
        navigate("/add-product");
      }, 2000);
} catch (err) {
  console.error("שגיאה:", err);

  const status = err?.response?.status;
  const data = err?.response?.data;

  // כפילות ת״ז מהשרת (החזרת 409 + code: "DUP_ID")
  if (status === 409 && (data?.code === "DUP_ID" || data?.field === "id_number")) {
    setIdErrMsg(data?.message || "קיים כבר מספר תעודת זהות זה במערכת. להמשך בירור פנה לצוות התמיכה");
    return; // לא לפתוח מודאל
  }

  // שגיאת ולידציה אחרת מהשרת
  if (status && data?.message) {
    openModal({ title: "שגיאה", message: data.message });
    return;
  }

  // ברירת מחדל
  openModal({ title: "שגיאה", message: "שגיאה בעדכון. נסה שוב מאוחר יותר" });
}

  };

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
  inputMode="numeric"
  maxLength={9}
  value={idNumber}
  onChange={(e) => {
    const v = e.target.value.replace(/\D/g, "").slice(0, 9);
    setIdNumber(v);
    if (idErrMsg) setIdErrMsg("");
  }}
  className={`${styles.input} ${idErrMsg ? styles.error : ""}`}
  aria-invalid={idErrMsg ? "true" : "false"}
  aria-describedby={idErrMsg ? "id-error" : undefined}
/>

{idErrMsg && (
  <div id="id-error" className={styles.fieldError} role="alert" aria-live="polite">
    {idErrMsg}
  </div>
)}

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
 <div className={styles.inputGroup}>
  <label>טלפון נייד:</label>
  <div className={styles.phoneRow}>
    <input
      className={`${styles.input} ${styles.phoneNumber}`}
      type="text"
      dir="ltr"
      inputMode="numeric"
      placeholder="7 ספרות"
      value={phone7}
      maxLength={7}
      onChange={(e) => {
        const v = e.target.value.replace(/\D/g, "");
        if (v.length <= 7) setPhone7(v);
      }}
    />

    <select
      className={`${styles.input} ${styles.phonePrefix}`}
      value={phonePrefix}
      onChange={(e) => setPhonePrefix(e.target.value)}
    >
     <option value="+97250">+972 50</option>
                    <option value="+97252">+972 52</option>
                    <option value="+97253">+972 53</option>
                    <option value="+97254">+972 54</option>
                    <option value="+97255">+972 55</option>
                    <option value="+97256">+972 56</option>
                    <option value="+97258">+972 58</option>
    </select>
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
                <select
                  className={`${styles.input} ${cityTouched && !selectedCity ? styles.error ?? "" : ""}`}
                  value={selectedCity}
                  onChange={handleCityChange}
                  onBlur={() => setCityTouched(true)}
                >
                  <option value="">בחר יישוב</option>
                  {citiesData.map((c, idx) => (
                    <option key={idx} value={c.city}>
                      {c.city}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.inputGroup}>
                <label>רחוב:</label>
                <select
                  className={styles.input}
                  value={selectedStreet}
                  onChange={(e) => {
                    if (!selectedCity) {
                      setCityTouched(true);
                      openModal({ title: "שגיאה", message: "יש לבחור קודם יישוב" });
                      return;
                    }
                    setSelectedStreet(e.target.value);
                  }}
                >
                  <option value="">בחר רחוב</option>
                  {availableStreets.map((street, idx) => (
                    <option key={idx} value={street}>
                      {street}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.inputGroup}>
                <label>מס' בית:</label>
                <input
                  className={styles.input}
                  value={houseNumber}
                  onChange={(e) => setHouseNumber(e.target.value)}
                />
              </div>

              <div className={styles.inputGroup}>
                <label>מס' דירה:</label>
                <input
                  className={styles.input}
                  value={apartmentNumber}
                  onChange={(e) => setApartmentNumber(e.target.value)}
                />
              </div>

              <div className={styles.inputGroup}>
                <label>מיקוד:</label>
                <input
                  className={styles.input}
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                />
              </div>
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
