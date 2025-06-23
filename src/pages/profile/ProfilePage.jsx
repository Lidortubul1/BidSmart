import { useState, useEffect } from "react";
import { useAuth } from "../../auth/AuthContext";
import styles from "./ProfilePage.module.css";
import citiesData from "../../assets/data/cities_with_streets.json";
import ChangePassword from "../../components/ChangePassword/ChangePassword";
import { updateUserProfile } from "../../services/authApi";
import CustomModal from "../../components/CustomModal/CustomModal";
import { useNavigate } from "react-router-dom";

function ProfilePage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [idCardPhoto, setIdCardPhoto] = useState(null);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [phonePrefix, setPhonePrefix] = useState("+972");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [zip, setZip] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [apartmentNumber, setApartmentNumber] = useState("");
  const [phoneError, setPhoneError] = useState(false);
  const [selectedCity, setSelectedCity] = useState("");
  const [availableStreets, setAvailableStreets] = useState([]);
  const [selectedStreet, setSelectedStreet] = useState("");
  const [cityTouched, setCityTouched] = useState(false);
  const [country, setCountry] = useState("ישראל");
  const [showChangePassword, setShowChangePassword] = useState(false);

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
    if (user) {
      setEmail(user.email || "");
      setFirstName(user.first_name || "");
      setLastName(user.last_name || "");
      setIdNumber(user.id_number || "");
      setPhoneNumber(user.phone?.slice(phonePrefix.length) || "");
      setZip(user.zip || "");
      setHouseNumber(user.house_number || "");
      setApartmentNumber(user.apartment_number || "");
      setSelectedCity(user.city || "");
      setSelectedStreet(user.street || "");
      const found = citiesData.find((c) => c.city === user.city);
      setAvailableStreets(found ? found.streets : []);
    }
  }, [user]);

  const handleCityChange = (e) => {
    const city = e.target.value;
    setSelectedCity(city);
    setCityTouched(true);
    const found = citiesData.find((c) => c.city === city);
    setAvailableStreets(found ? found.streets : []);
    setSelectedStreet("");
  };

  const handleSave = async (e) => {
    e.preventDefault();

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.(com|org|net|edu|gov|il|co\.il|gmail\.com|hotmail\.com|outlook\.com)$/;
    const zipRegex = /^\d{5,7}$/;
    const idRegex = /^\d{9}$/;
    const houseRegex = /^\d+$/;

    if (!emailRegex.test(email)) {
      return showModal({
        title: "שגיאה",
        message: "כתובת אימייל לא תקינה",
        confirmText: "סגור",
        onConfirm: () => setModalVisible(false),
      });
    }

    if (firstName.trim() === "" || lastName.trim() === "") {
      return showModal({
        title: "שגיאה",
        message: "שם פרטי ושם משפחה הם שדות חובה",
        confirmText: "סגור",
        onConfirm: () => setModalVisible(false),
      });
    }

    if (phoneNumber !== "") {
      if (phoneNumber.length !== 7) {
        return showModal({
          title: "שגיאה",
          message: "מספר הטלפון חייב להכיל בדיוק 7 ספרות (ללא הקידומת)",
          confirmText: "סגור",
          onConfirm: () => setModalVisible(false),
        });
      }

      if (!/^\+9725\d{1}$/.test(phonePrefix)) {
        return showModal({
          title: "שגיאה",
          message: "קידומת טלפון לא תקינה",
          confirmText: "סגור",
          onConfirm: () => setModalVisible(false),
        });
      }
    } else if (user.phone && user.phone !== "") {
      return showModal({
        title: "שגיאה",
        message: "לא ניתן למחוק את מספר הטלפון לאחר שמולא",
        confirmText: "סגור",
        onConfirm: () => setModalVisible(false),
      });
    }
    

    if (idNumber !== "") {
      if (!idRegex.test(idNumber)) {
        return showModal({
          title: "שגיאה",
          message: "תעודת זהות חייבת להכיל 9 ספרות",
          confirmText: "סגור",
          onConfirm: () => setModalVisible(false),
        });
      }
    } else if (user.id_number && user.id_number !== "") {
      return showModal({
        title: "שגיאה",
        message: "לא ניתן למחוק את תעודת הזהות לאחר שהוזנה",
        confirmText: "סגור",
        onConfirm: () => setModalVisible(false),
      });
    }

    if (zip && !zipRegex.test(zip)) {
      return showModal({
        title: "שגיאה",
        message: "מיקוד לא תקין (5–7 ספרות)",
        confirmText: "סגור",
        onConfirm: () => setModalVisible(false),
      });
    }

    if (houseNumber && !houseRegex.test(houseNumber)) {
      return showModal({
        title: "שגיאה",
        message: "שדה מספר בית לא תקין",
        confirmText: "סגור",
        onConfirm: () => setModalVisible(false),
      });
    }
    
    const formData = new FormData();
    formData.append("email", user.email);
    formData.append("new_email", email);
    formData.append("first_name", firstName);
    formData.append("last_name", lastName);
    formData.append("id_number", idNumber);
    formData.append("phone", phonePrefix + phoneNumber);
    formData.append("country", country);
    formData.append("zip", zip);
    formData.append("city", selectedCity);
    formData.append("street", selectedStreet);
    formData.append("house_number", houseNumber);
    formData.append("apartment_number", apartmentNumber);

    if (idCardPhoto) formData.append("id_card_photo", idCardPhoto);
    if (profilePhoto !== null) {
      // גם null נשלח (למחיקה), וגם קובץ אם נבחר
      if (profilePhoto === "REMOVE") {
        formData.append("remove_profile_photo", "1");
      } else {
        formData.append("profile_photo", profilePhoto);
      }
    }

    try {
      const res = await updateUserProfile(formData);
      if (res.success) {
        setUser(res.updatedUser);
        showModal({
          title: "הצלחה",
          message: "הפרופיל עודכן בהצלחה!",
          confirmText: "סגור",
          onConfirm: () => setModalVisible(false),
        });
      } else {
        showModal({
          title: "שגיאה",
          message: res.message || "שגיאה בעדכון הפרופיל",
          confirmText: "סגור",
          onConfirm: () => setModalVisible(false),
        });
      }
    } catch (err) {
      showModal({
        title: "שגיאת רשת",
        message: "שגיאה בחיבור לשרת",
        confirmText: "סגור",
        onConfirm: () => setModalVisible(false),
      });
    }
  };
  

  if (!user) {
    // אפשר להחזיר משהו אחר כמו <Navigate /> או הודעה
    return (
      <div className={styles.page}>
        <p>מתנתק מהמערכת, מעביר בחזרה לדף הבית</p>
      </div>
    );
  }
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.media}>
          <div className={styles.box}>
            <label>תמונת פרופיל</label>
            <input
              type="file"
              onChange={(e) => setProfilePhoto(e.target.files[0])}
            />
            {profilePhoto === "REMOVE" ? (
              <div>התמונה תוסר לאחר שמירה</div>
            ) : profilePhoto ? (
              <img
                src={URL.createObjectURL(profilePhoto)}
                className={styles.profileImagePreview}
                alt="תצוגה מקדימה"
              />
            ) : user?.profile_photo ? (
              <>
                <img
                  src={`http://localhost:5000/uploads/${user.profile_photo}`}
                  className={styles.profileImagePreview}
                  alt="תמונת פרופיל"
                />
                <button type="button" onClick={() => setProfilePhoto("REMOVE")}>
                  הסר תמונה
                </button>
              </>
            ) : (
              <div style={{ marginTop: "10px" }}>אין תמונה</div>
            )}
          </div>

          <div className={styles.box}>
            <label>תעודת זהות (קובץ)</label>
            <input
              type="file"
              onChange={(e) => setIdCardPhoto(e.target.files[0])}
            />
            {user?.id_card_photo && (
              <img
                src={`http://localhost:5000/uploads/${user.id_card_photo}`}
                alt="תז"
                width="150"
                style={{ borderRadius: "6px", marginTop: "10px" }}
              />
            )}
          </div>
        </div>

        <form className={styles.form} onSubmit={handleSave}>
          <h2>הפרופיל שלי</h2>

          <div className={styles.columns}>
            <div className={styles.inputsColumn}>
              <div className={styles.inputGroup}>
                <label>תפקיד</label>
                <input type="text" value={user?.role} disabled />
              </div>

              <div className={styles.inputGroup}>
                <label>אימייל</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label>שם פרטי</label>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>

              <div className={styles.inputGroup}>
                <label>שם משפחה</label>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>

              <div className={styles.inputGroup}>
                <label>שינוי סיסמה</label>
                <button
                  type="button"
                  className={styles.changePasswordButton}
                  onClick={() => setShowChangePassword(true)}
                >
                  לחץ כאן
                </button>
              </div>

              <div className={styles.inputGroup}>
                <label>נייד</label>
                <div className={styles.phoneRow}>
                  <select
                    value={phonePrefix}
                    onChange={(e) => setPhonePrefix(e.target.value)}
                  >
                    <option value="+97250">50 972+</option>
                    <option value="+97252">52 972+</option>
                    <option value="+97253">53 972+</option>
                    <option value="+97254">54 972+</option>
                    <option value="+97255">55 972+</option>
                    <option value="+97256">56 972+</option>
                    <option value="+97258">58 972+</option>
                  </select>

                  <input
                    className={`${styles.phoneNumberInput} ${
                      phoneError ? styles.error : ""
                    }`}
                    value={phoneNumber}
                    inputMode="numeric"
                    maxLength={7}
                    onChange={(e) => {
                      const onlyNums = e.target.value.replace(/\D/g, "");
                      setPhoneNumber(onlyNums);
                      if (onlyNums.length === 7) setPhoneError(false);
                    }}
                    onBlur={() => {
                      if (phoneNumber.length !== 7) {
                        setPhoneError(true);
                        showModal({
                          title: "שגיאה",
                          message: "מספר טלפון לא תקין",
                          confirmText: "סגור",
                          onConfirm: () => setModalVisible(false),
                        });
                      }
                    }}
                  />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label>מדינה</label>
                <input value={country} disabled />
              </div>

              <div className={styles.inputGroup}>
                <label>מיקוד</label>
                <input value={zip} onChange={(e) => setZip(e.target.value)} />
              </div>

              <div className={styles.inputGroup}>
                <label>יישוב</label>
                <select
                  value={selectedCity}
                  onChange={handleCityChange}
                  onBlur={() => setCityTouched(true)}
                  className={cityTouched && !selectedCity ? styles.error : ""}
                >
                  <option value="">בחר יישוב</option>
                  {citiesData.map((c, index) => (
                    <option key={index} value={c.city}>
                      {c.city}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.inputGroup}>
                <label>רחוב</label>
                <select
                  value={selectedStreet}
                  onChange={(e) => {
                    if (!selectedCity) {
                      setCityTouched(true);
                      showModal({
                        title: "שגיאה",
                        message: "יש לבחור קודם יישוב",
                        confirmText: "סגור",
                        onConfirm: () => setModalVisible(false),
                      });
                      return;
                    }

                    setSelectedStreet(e.target.value);
                  }}
                >
                  <option value="">בחר רחוב</option>
                  {availableStreets.map((street, index) => (
                    <option key={index} value={street}>
                      {street}
                    </option>
                  ))}
                </select>
              </div>

              <label>מספר בית</label>
              <input
                value={houseNumber}
                onChange={(e) => setHouseNumber(e.target.value)}
              />

              <label>מספר דירה</label>
              <input
                value={apartmentNumber}
                onChange={(e) => setApartmentNumber(e.target.value)}
              />

              <label>מספר תעודת זהות</label>
              <input
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                disabled={user.id_number && user.id_number !== ""}
              />
            </div>

            <div className={styles.uploadsColumn}></div>
          </div>

          <button type="submit">שמור שינויים</button>
        </form>
      </div>

      {showChangePassword && (
        <ChangePassword
          email={email}
          onClose={() => setShowChangePassword(false)}
          onSuccess={() => {
            // קודם נסגור את ChangePassword
            setShowChangePassword(false);

            // ואז נציג את המודאל אחרי השהייה קצרה כדי לא ליצור overlap
            setTimeout(() => {
              showModal({
                title: "הצלחה",
                message: "הסיסמה שונתה בהצלחה",
                confirmText: "סגור",
                onConfirm: () => setModalVisible(false),
              });
            }, 100); // 100ms זה מספיק
          }}
        />
      )}

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

export default ProfilePage;
