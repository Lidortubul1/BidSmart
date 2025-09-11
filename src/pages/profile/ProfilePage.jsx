//src\pages\profile\ProfilePage.jsx
// ProfilePage: ניהול פרטי משתמש (שם, טלפון, כתובת), שינוי סיסמה ותמונת פרופיל, כולל ולידציות, בחירת עיר/רחוב, ושינוי שיטת משלוח למוכר – עם מודאלים לאישורים/שגיאות.

import { useState, useEffect } from "react";
import { useAuth } from "../../auth/AuthContext";
import styles from "./ProfilePage.module.css";
import citiesData from "../../assets/data/cities_with_streets.json";
import ChangePassword from "../../components/ChangePassword/ChangePassword";
import { updateUserProfile } from "../../services/authApi";
import CustomModal from "../../components/CustomModal/CustomModal";

// מפענח טלפון בפורמט +9725XYYYYYYY
// מחליף את parseIlMobile הקיים
function parseIlMobile(raw) {
  if (!raw) return null;

  // מנקה לכל ספרות בלבד
  let digits = String(raw).replace(/\D/g, "");

  // מקרים אפשריים:
  // 1) 9725XYYYYYYY  (12 ספרות, בלי +)
  // 2) 05XYYYYYYY    (10 ספרות)
  // 3) 5XYYYYYYY     (9 ספרות)
  // 4) +9725XYYYYYYY (אם מגיע עם +, נורמליזציה בהמשך תתפוס)

  // אם מגיע עם פלוס מראש, הסרת תווים לא-ספרתיים כבר השאירה בלי '+'
  // לכן נבדוק קודם תרחישי 972/05/5

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

  // ניסיון אחרון: אולי זה כבר בפורמט מלא כולל +, לדוגמה "+9725XYYYYYYY"
  const withPlus = raw.replace(/\s|-/g, "");
  const m = withPlus.match(/^\+9725(\d)(\d{7})$/);
  if (m) {
    return { prefix: `+9725${m[1]}`, number: m[2] };
  }

  return null;
}

function isValidIlMobile(prefix, number) {
  return /^\+9725\d$/.test(prefix) && /^\d{7}$/.test(number);
}

function normalize(v) {
  return (v ?? "").toString().trim();
}

function ProfilePage() {
  const { user, setUser } = useAuth();

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [idCardPhoto] = useState(null);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [phonePrefix, setPhonePrefix] = useState("+97250");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [zip, setZip] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [apartmentNumber, setApartmentNumber] = useState("");
  const [phoneError, setPhoneError] = useState(false);
  const [selectedCity, setSelectedCity] = useState("");
  const [availableStreets, setAvailableStreets] = useState([]);
  const [selectedStreet, setSelectedStreet] = useState("");
  const [cityTouched, setCityTouched] = useState(false);
  const country = "ישראל";
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [deliveryOptions, setDeliveryOptions] = useState("delivery");

  // מצב איסוף עצמי פעיל?
  const isPickupMode =
    user?.role === "seller" && deliveryOptions === "delivery+pickup";

  // מודאל כללי
  const [modalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState({
    title: "",
    message: "",
    confirmText: "",
    cancelText: "",
    onConfirm: null,
    onCancel: null,
  });

  // לשמירה לאחר אישור (למוכר ששינה כתובת)
  const [pendingFormData, setPendingFormData] = useState(null);

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
// בסמוך ל-useState של selectedCity/selectedStreet
const baseCities = citiesData.map((c) => (c.city ?? "").trim());
const selectedCityNorm = (selectedCity ?? "").trim();
const cityOptions = selectedCityNorm && !baseCities.includes(selectedCityNorm)
  ? [selectedCityNorm, ...baseCities]
 : baseCities;
  // הודעת תמיכה על ניסיון שינוי של שדה חסום
  const notifyLocked = (what) => {
    const copy = {
      email: {
        title: "שינוי אימייל חסום",
        message:
          "שינוי כתובת אימייל אינו זמין כרגע. במידה והינך רוצה לשנות נתון זה נא לפנות לצוות התמיכה שלנו.",
      },
      id_number: {
        title: "שינוי תעודת זהות חסום",
        message:
          "לא ניתן לשנות מספר תעודת זהות לאחר שהוזן. אם נדרש עדכון, נא לפנות לצוות התמיכה שלנו.",
      },
      id_card_photo: {
        title: "שינוי מסמך תעודת זהות חסום",
        message:
          "לא ניתן להחליף מסמך תעודת זהות שכבר הועלה. במידה והינך רוצה לשנות נתון זה נא לפנות לצוות התמיכה שלנו במייל bidsmart2025@gmail.com",
      },
    }[what];

    showModal({
      title: copy.title,
      message: copy.message,
      confirmText: "סגור",
      onConfirm: () => setModalVisible(false),
    });
  };

  // חוסם פוקוס/קליק/מקלדת ומרים מודאל
  const handleLockedMouseDown = (e, what) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.blur();
    notifyLocked(what);
  };
  const handleLockedKeyDown = (e, what) => {
    e.preventDefault();
    e.stopPropagation();
    notifyLocked(what);
  };

  useEffect(() => {
    if (user) {
     setEmail(String(user.email ?? ""));
   setFirstName(String(user.first_name ?? ""));
   setLastName(String(user.last_name ?? ""));
   setIdNumber(String(user.id_number ?? ""));

   const uAddr = user.address ?? user; // תמיכה גם במבנה מקונן וגם שטוח
   const cityVal = String(uAddr.city ?? "").trim();
   const streetVal = String(uAddr.street ?? "").trim();
   setZip(String(uAddr.zip ?? uAddr.postal_code ?? ""));
   setHouseNumber(String(uAddr.house_number ?? ""));
   setApartmentNumber(String(uAddr.apartment_number ?? ""));
   setSelectedCity(cityVal);
   setSelectedStreet(streetVal);
const found = citiesData.find(
   (c) => (c.city ?? "").trim() === cityVal
);
const baseStreets = (found ? found.streets : []).map((s) => (s ?? "").trim());
const savedStreetNorm = streetVal;
const streetsWithSaved =
  savedStreetNorm && !baseStreets.includes(savedStreetNorm)
    ? [savedStreetNorm, ...baseStreets]
    : baseStreets;

   setAvailableStreets(streetsWithSaved);      
    setDeliveryOptions(String(user.delivery_options ?? "delivery"));

      const parsed = parseIlMobile(user.phone);
      if (parsed) {
        setPhonePrefix(parsed.prefix);
        setPhoneNumber(parsed.number);
      } else {
        setPhoneNumber("");
      }
    }
  }, [user]);

  useEffect(() => {
    setPhoneError(false);
  }, [phonePrefix, phoneNumber]);

  const handleCityChange = (e) => {
    const city = e.target.value;
    setSelectedCity(city);
    setCityTouched(true);
  const found = citiesData.find(
  (c) => (c.city ?? "").trim() === (city ?? "").trim()
);
const baseStreets = (found ? found.streets : []).map((s) => (s ?? "").trim());
const selectedStreetNorm = (selectedStreet ?? "").trim();
const streetsWithSaved =
  selectedStreetNorm && !baseStreets.includes(selectedStreetNorm)
    ? [selectedStreetNorm, ...baseStreets]
    : baseStreets;
 setAvailableStreets(streetsWithSaved);
    setSelectedStreet("");
  };

  // ביצוע העדכון בפועל
  const performUpdate = async (formData) => {
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
    } catch {
      showModal({
        title: "שגיאת רשת",
        message: "שגיאה בחיבור לשרת",
        confirmText: "סגור",
        onConfirm: () => setModalVisible(false),
      });
    } finally {
      setPendingFormData(null);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.(com|org|net|edu|gov|il|co\.il|gmail\.com|hotmail\.com|outlook\.com)$/;
    const zipRegex = /^\d{5,7}$/;
    const idRegex = /^\d{9}$/;
    const houseRegex = /^\d+$/;

    const prevDelivery = user?.delivery_options || "delivery";
    const changingDelivery = prevDelivery !== deliveryOptions;

    // אימותים כלליים
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
      if (!isValidIlMobile(phonePrefix, phoneNumber)) {
        return showModal({
          title: "שגיאה",
          message: "מספר נייד לא תקין. יש לבחור קידומת ולמלא 7 ספרות.",
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

    // *** חדש: אם במצב איסוף עצמי – כל שדות הכתובת חייבים להיות מלאים (אי אפשר "למחוק") ***
    if (isPickupMode) {
      const missingAddress =
        !normalize(country) ||
        !normalize(zip) ||
        !normalize(selectedCity) ||
        !normalize(selectedStreet) ||
        !normalize(houseNumber) ||
        !normalize(apartmentNumber);

      if (missingAddress) {
        return showModal({
          title: "כתובת חנות נדרשת",
          message:
            "במצב 'משלוח + איסוף עצמי' לא ניתן להשאיר שדות כתובת ריקים. יש למלא מדינה, מיקוד, יישוב, רחוב, מספר בית ומספר דירה.",
          confirmText: "סגור",
          onConfirm: () => setModalVisible(false),
        });
      }
    }

    const isEmailLocked = true;
    const isIdPhotoLocked = !!user?.id_card_photo;

    // בניית FormData
    const formData = new FormData();
    formData.append("email", user.email);

    if (!isEmailLocked && email && email !== user.email) {
      formData.append("new_email", email);
    }

    formData.append("first_name", firstName);
    formData.append("last_name", lastName);

    // שולחים את אותה ת״ז חזרה (גם אם נעול) כדי שהשרת לא יחשוב שמחקנו
    formData.append("id_number", idNumber);

    if (phoneNumber !== "") formData.append("phone", phonePrefix + phoneNumber);
    formData.append("country", country);
    formData.append("zip", zip);
    formData.append("city", selectedCity);
    formData.append("street", selectedStreet);
    formData.append("house_number", houseNumber);
    formData.append("apartment_number", apartmentNumber);

    // לשלוח גם שיטת משלוח
    formData.append("delivery_options", deliveryOptions);

    if (!isIdPhotoLocked && idCardPhoto) {
      formData.append("id_card_photo", idCardPhoto);
    }

    if (profilePhoto !== null) {
      if (profilePhoto === "REMOVE") {
        formData.append("remove_profile_photo", "1");
      } else {
        formData.append("profile_photo", profilePhoto);
      }
    }

    // --- לוגיקת שינוי שיטת משלוח (נשאר) ---
    if (user?.role === "seller" && changingDelivery) {
      if (deliveryOptions === "delivery+pickup") {
        // מעבר לאיסוף עצמי מחייב כתובת מלאה
        const missingAddress =
          !normalize(country) ||
          !normalize(zip) ||
          !normalize(selectedCity) ||
          !normalize(selectedStreet) ||
          !normalize(houseNumber) ||
          !normalize(apartmentNumber);

        if (missingAddress) {
          return showModal({
            title: "חסרים פרטי כתובת חנות",
            message:
              "כדי לאפשר 'משלוח + איסוף עצמי' יש למלא תחילה את כל פרטי הכתובת (מדינה, מיקוד, יישוב, רחוב, מספר בית ומספר דירה).",
            confirmText: "סגור",
            onConfirm: () => setModalVisible(false),
          });
        }

        // יש כתובת מלאה — מבקשים אישור
        setPendingFormData(formData);
        return showModal({
          title: "אישור שיטת משלוח",
          message:
            "כתובת החנות הרשומה במערכת תופיע לרוכשים כאפשרות לאיסוף עצמי. להמשיך?",
          confirmText: "אישור",
          cancelText: "ביטול",
          onConfirm: () => {
            setModalVisible(false);
            performUpdate(pendingFormData || formData);
          },
          onCancel: () => {
            setModalVisible(false);
            setPendingFormData(null);
            setDeliveryOptions(prevDelivery); // חזרה לערך הקודם
          },
        });
      }

      // מעבר מ"המשלוח + איסוף עצמי" ל"המשלוח" בלבד
      if (prevDelivery === "delivery+pickup" && deliveryOptions === "delivery") {
        setPendingFormData(formData);
        return showModal({
          title: "שינוי לשיטת משלוח בלבד",
          message:
            "במידה ויש רוכשים שבחרו באיסוף עצמי במוצרייך – הינך נדרש/ת לספק להם לכתובת שהזנת עד כה. מעכשיו מכירות עתידיות יתעדכנו בהתאם לשינוי זה.",
          confirmText: "אישור",
          cancelText: "ביטול",
          onConfirm: () => {
            setModalVisible(false);
            performUpdate(pendingFormData || formData);
          },
          onCancel: () => {
            setModalVisible(false);
            setPendingFormData(null);
            setDeliveryOptions(prevDelivery);
          },
        });
      }
    }

    // ↓↓↓ אישור כתובת לחנות – נשאר כמו שהיה אצלך ↓↓↓
    const sellerChangingAddress =
      user?.role === "seller" &&
      (normalize(zip) !== normalize(user?.zip) ||
        normalize(selectedCity) !== normalize(user?.city) ||
        normalize(selectedStreet) !== normalize(user?.street) ||
        normalize(houseNumber) !== normalize(user?.house_number) ||
        normalize(apartmentNumber) !== normalize(user?.apartment_number));

    if (sellerChangingAddress) {
      setPendingFormData(formData);
      return showModal({
        title: "עדכון כתובת חנות",
        message:
          'ברגע שתלחץ "אישור" זו תהיה כתובת החנות שתופיע בפרטי המוצרים שלך. האם אתה בטוח שברצונך לשנות אותה?',
        confirmText: "אישור",
        cancelText: "ביטול",
        onConfirm: () => {
          setModalVisible(false);
          if (pendingFormData) {
            // אם כבר קיים ב־state, השתמש בו; אחרת השתמש ב־formData המקומי
            performUpdate(pendingFormData);
          } else {
            performUpdate(formData);
          }
        },
        onCancel: () => {
          setPendingFormData(null);
          setModalVisible(false);
          // לא מבצעים כלום — השמירה מתבטלת
        },
      });
    }

    // ללא צורך באישור – שמירה רגילה
    performUpdate(formData);
  };

  if (!user) {
    return (
      <div className={styles.pfPage}>
        <p>מתנתק מהמערכת, מעביר בחזרה לדף הבית</p>
      </div>
    );
  }

  const hasIdNumber = !!user?.id_number;
  const hasIdCardPhoto = !!user?.id_card_photo;
  const isEmailLocked = true;

  return (
    <div className={styles.pfPage}>
      
      <div className={styles.pfCard}>
        <h2 className={styles.Title} >עדכון פרטים אישיים</h2>
        
        {/* אזור קבצים/מדיה */}
        <div className={styles.pfMedia}>
          <div className={styles.pfBox}>
            <label className={styles.pfLabel}>תמונת פרופיל</label>
            <input
              className={styles.pfFile}
              type="file"
              onChange={(e) => setProfilePhoto(e.target.files[0])}
            />
            {profilePhoto === "REMOVE" ? (
              <div className={styles.pfMuted}>התמונה תוסר לאחר שמירה</div>
            ) : profilePhoto ? (
              <img
                src={URL.createObjectURL(profilePhoto)}
                className={styles.pfProfileImage}
                alt="תצוגה מקדימה"
              />
            ) : user?.profile_photo ? (
              <>
                <img
                  src={`http://localhost:5000/uploads/${user.profile_photo}`}
                  className={styles.pfProfileImage}
                  alt="תמונת פרופיל"
                />
                <button
                  type="button"
                  className={styles.pfGhostBtn}
                  onClick={() => setProfilePhoto("REMOVE")}
                >
                  הסר תמונה
                </button>
              </>
            ) : (
              <div className={styles.pfMuted}>אין תמונה</div>
            )}
          </div>

          {/* קופסת ת״ז (קובץ) – מוצגת רק אם יש כבר קובץ ת״ז */}
          {hasIdCardPhoto && (
            <div className={styles.pfBox}>
              <label className={styles.pfLabel}>תעודת זהות (קובץ)</label>

              {/* סטטוס בלבד, בלי תמונה */}
              <div className={styles.pfMuted}>מסמך תעודת זהות שמור במערכת.</div>
              <button
                type="button"
                className={styles.pfGhostBtn}
                onClick={() => notifyLocked("id_card_photo")}
              >
                החלפת מסמך…
              </button>
              {/* מספר תעודת זהות – מתחת לקובץ */}
              {hasIdNumber && (
                <div className={styles.pfGroup} style={{ marginTop: 8 }}>
                  <label className={styles.pfLabel}>מספר תעודת זהות</label>
                  <input
                    className={`${styles.pfInput} ${styles.pfReadOnly}`}
                    value={idNumber}
                    readOnly
                    onMouseDown={(e) => handleLockedMouseDown(e, "id_number")}
                    onKeyDown={(e) => handleLockedKeyDown(e, "id_number")}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* טופס פרטים */}
        <form className={styles.pfForm} onSubmit={handleSave}>
          <h2 className={styles.pfTitle}>הפרופיל שלי</h2>

          <div className={styles.pfColumns}>
            <div className={styles.pfInputsCol}>
              {/* כל שדה בשורה נפרדת */}
              <div className={styles.pfGroup}>
                <label className={styles.pfLabel}>תפקיד</label>
                <input className={styles.pfInput} type="text" value={user?.role} readOnly />
              </div>

              <div className={styles.pfGroup}>
                <label className={styles.pfLabel}>אימייל</label>
                <input
                  className={`${styles.pfInput} ${styles.pfReadOnly}`}
                  type="email"
                  value={email}
                  readOnly
                  onMouseDown={(e) => isEmailLocked && handleLockedMouseDown(e, "email")}
                  onKeyDown={(e) => isEmailLocked && handleLockedKeyDown(e, "email")}
                />
              </div>

              {user?.role === "seller" && (
                <div className={styles.pfGroup}>
                  <label className={styles.pfLabel}>שיטת משלוח</label>
                  <select
                    className={styles.pfSelect}
                    value={deliveryOptions}
                    onChange={(e) => setDeliveryOptions(e.target.value)}
                  >
                    <option value="delivery">משלוח</option>
                    <option value="delivery+pickup">משלוח + איסוף עצמי</option>
                  </select>
                </div>
              )}

              <div className={styles.pfGroup}>
                <label className={styles.pfLabel}>שם פרטי</label>
                <input
                  className={styles.pfInput}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>

              <div className={styles.pfGroup}>
                <label className={styles.pfLabel}>שם משפחה</label>
                <input
                  className={styles.pfInput}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>

              <div className={styles.pfGroup}>
                <label className={styles.pfLabel}>נייד</label>
                <div className={styles.pfPhoneRow}>
                  <select
                    className={styles.pfSelect}
                    value={phonePrefix}
                    onChange={(e) => setPhonePrefix(e.target.value)}
                  >
                    <option value="+97250">+972 50</option>
                    <option value="+97252">+972 52</option>
                    <option value="+97253">+972 53</option>
                    <option value="+97254">+972 54</option>
                    <option value="+97255">+972 55</option>
                    <option value="+97256">+972 56</option>
                     <option value="+97257">+972 57</option>
                    <option value="+97258">+972 58</option>
                  </select>

                  <input
                    className={`${styles.pfInput} ${styles.pfPhoneInput} ${
                      phoneError ? styles.pfError : ""
                    }`}
                    dir="ltr"                // ← נוסף
                    value={phoneNumber}
                    inputMode="numeric"
                    maxLength={7}
                    onChange={(e) => {
                      const onlyNums = e.target.value.replace(/\D/g, "");
                      setPhoneNumber(onlyNums);
                      if (onlyNums.length === 7) setPhoneError(false);
                    }}
                    onBlur={() => {
                      if (phoneNumber === "") {
                        setPhoneError(false);
                        return;
                      }
                      if (!isValidIlMobile(phonePrefix, phoneNumber)) {
                        setPhoneError(true);
                        showModal({
                          title: "שגיאה",
                          message:
                            "מספר נייד לא תקין. יש לבחור קידומת ולמלא 7 ספרות.",
                          confirmText: "סגור",
                          onConfirm: () => setModalVisible(false),
                        });
                      } else {
                        setPhoneError(false);
                      }
                    }}
                  />
                </div>
              </div>

              <div className={styles.pfGroup}>
                <label className={styles.pfLabel}>מדינה</label>
                <input className={`${styles.pfInput} ${styles.pfReadOnly}`} value={country} readOnly />
              </div>

              <div className={styles.pfGroup}>
                <label className={styles.pfLabel}>מיקוד</label>
                <input
                  className={styles.pfInput}
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  required={isPickupMode}
                />
              </div>

              <div className={styles.pfGroup}>
                <label className={styles.pfLabel}>יישוב</label>
                <select
                  className={`${styles.pfSelect} ${
                    cityTouched && !selectedCity ? styles.pfError : ""
                  }`}
                  value={selectedCity}
                  onChange={handleCityChange}
                  onBlur={() => setCityTouched(true)}
                  required={isPickupMode}
                >
                  <option value="">בחר יישוב</option>
                 {cityOptions.map((name, i) => (
  <option key={`${name}-${i}`} value={name}>{name}</option>
 ))}
                </select>
              </div>

              <div className={styles.pfGroup}>
                <label className={styles.pfLabel}>רחוב</label>
                <select
                  className={styles.pfSelect}
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
                  required={isPickupMode}
                >
                  <option value="">בחר רחוב</option>
                  {availableStreets.map((street, index) => (
                    <option key={index} value={street}>
                      {street}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.pfGroup}>
                <label className={styles.pfLabel}>מספר בית</label>
                <input
                  className={styles.pfInput}
                  value={houseNumber}
                  onChange={(e) => setHouseNumber(e.target.value)}
                  required={isPickupMode}
                />
              </div>

              <div className={styles.pfGroup}>
                <label className={styles.pfLabel}>מספר דירה</label>
                <input
                  className={styles.pfInput}
                  value={apartmentNumber}
                  onChange={(e) => setApartmentNumber(e.target.value)}
                  required={isPickupMode}
                />
              </div>

              <div className={styles.pfGroup}>
                <label className={styles.pfLabel}>שינוי סיסמה</label>
                <button
                  type="button"
                  className={styles.pfGhostBtn}
                  onClick={() => setShowChangePassword(true)}
                >
                  לחץ כאן
                </button>
              </div>
            </div>

            <div className={styles.pfUploadsCol} />
          </div>

          <div className={styles.pfActions}>
            <button type="submit" className={styles.pfPrimaryBtn}>
              שמור שינויים
            </button>
          </div>
        </form>
      </div>

      {showChangePassword && (
        <ChangePassword
          email={email}
          onClose={() => setShowChangePassword(false)}
          onSuccess={() => {
            setShowChangePassword(false);
            setTimeout(() => {
              showModal({
                title: "הצלחה",
                message: "הסיסמה שונתה בהצלחה",
                confirmText: "סגור",
                onConfirm: () => setModalVisible(false),
              });
            }, 100);
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
