import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import citiesData from "../../assets/data/cities_with_streets.json";
import CustomModal from "../../components/CustomModal/CustomModal.jsx";
import styles from "./ShippingForm.module.css";
import { useAuth } from "../../auth/AuthContext.js";
import {
  updateSaleAddress,
  updateUserAddress,
  getUserSavedAddress,
  updateUserPhone, 
} from "../../services/saleApi";

// —— פונקציות עזר כמו בפרופיל ——
function parseIlMobile(raw) {
  if (!raw) return null;
  const cleaned = String(raw).replace(/\s|-/g, "");
  const m = cleaned.match(/^\+9725\d(\d{7})$/);
  if (!m) return null;
  return { prefix: cleaned.slice(0, 6), number: m[1] };
}
function isValidIlMobile(prefix, number) {
  return /^\+9725\d$/.test(prefix) && /^\d{7}$/.test(number);
}

function ShippingForm() {
  const { id } = useParams(); // מזהה המוצר
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const homePath = user?.role === "seller" ? "/seller" : "/buyer";

  const [selectedCity, setSelectedCity] = useState("");
  const [availableStreets, setAvailableStreets] = useState([]);
  const [deliveryMethod, setDeliveryMethod] = useState(""); // "delivery" או "pickup"

  // טופס
  const [formData, setFormData] = useState({
    city: "",
    street: "",
    house_number: "",
    apartment_number: "",
    zip: "",
    notes: "", //  הערות למוכר
    phone: "", // ייסונכרן אוטומטית מהקידומת+מספר
  });

  // טלפון בסגנון הפרופיל
  const [phonePrefix, setPhonePrefix] = useState("+97250");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneError, setPhoneError] = useState(false);

  // טען ברירת מחדל מה־user בעת פתיחת הדף
  useEffect(() => {
    const parsed = parseIlMobile(user?.phone);
    if (parsed) {
      setPhonePrefix(parsed.prefix);
      setPhoneNumber(parsed.number);
      setFormData((prev) => ({ ...prev, phone: user.phone }));
    }
  }, [user]);

  // סנכרון formData.phone בכל שינוי קידומת/מספר
  useEffect(() => {
    if (isValidIlMobile(phonePrefix, phoneNumber)) {
      setFormData((prev) => ({ ...prev, phone: phonePrefix + phoneNumber }));
    } else {
      setFormData((prev) => ({ ...prev, phone: "" }));
    }
    if (phoneError) setPhoneError(false);
  }, [phonePrefix, phoneNumber, phoneError]);

  // מודאל
  const [modalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState({
    title: "",
    message: "",
    confirmText: "",
    cancelText: "",
    extraButtonText: "",     // 🆕 נתמוך בכפתור שלישי דרך CustomModal הקיים
    onConfirm: null,
    onCancel: null,
    onExtra: null,           // 🆕
  });

  const showModal = ({
    title,
    message,
    confirmText,
    cancelText,
    extraButtonText,
    onConfirm,
    onCancel,
    onExtra,
  }) => {
    setModalContent({
      title,
      message,
      confirmText,
      cancelText,
      extraButtonText,
      onConfirm,
      onCancel,
      onExtra,
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

  // —— שמירות ממוקדות לפרופיל ——
  async function saveAddressOnly() {
    const { city, street, house_number, apartment_number, zip } = formData;
    const r = await updateUserAddress(id, { city, street, house_number, apartment_number, zip }); // בלי phone
    if (!r.success) throw new Error(r.message || "הכתובת לא נשמרה בפרופיל.");
    setUser((prev) => ({
      ...(prev || {}),
      city,
      street,
      house_number,
      apartment_number,
      zip,
    }));
  }
  async function savePhoneOnly(fullPhone) {
    const r = await updateUserPhone(id, fullPhone);
    if (!r.success) throw new Error(r.message || "הטלפון לא נשמר בפרופיל.");
    setUser((prev) => ({ ...(prev || {}), phone: fullPhone }));
  }

  // ——— מודאל 3 כפתורים למשלוח ———
  function openSaveChoicesModal(fullPhone) {
    showModal({
      title: "שמירה לפרופיל",
      message: "מה תרצה לשמור לפרופיל שלך?",
      // מיפוי: cancel=כתובת, extra=טלפון, confirm=שניהם
      cancelText: "שמור כתובת בלבד",
      extraButtonText: "שמור טלפון בלבד",
      confirmText: "שמור כתובת וגם טלפון",
      onCancel: async () => {
        setModalVisible(false);
        try {
          await saveAddressOnly();
          showModal({
            title: "הצלחה",
            message: "הכתובת נשמרה בפרופיל.",
            confirmText: "חזרה לדף הבית",
            onConfirm: () => navigate(homePath),
            onCancel: () => setModalVisible(false),
          });
        } catch (e) {
          showModal({
            title: "שגיאה",
            message: e.message,
            confirmText: "סגור",
            onConfirm: () => setModalVisible(false),
          });
        }
      },
      onExtra: async () => {
        setModalVisible(false);
        try {
          await savePhoneOnly(fullPhone);
          showModal({
            title: "הצלחה",
            message: "הטלפון נשמר בפרופיל.",
            confirmText: "חזרה לדף הבית",
            onConfirm: () => navigate(homePath),
          });
        } catch (e) {
          showModal({
            title: "שגיאה",
            message: e.message,
            confirmText: "סגור",
            onConfirm: () => setModalVisible(false),
          });
        }
      },
      onConfirm: async () => {
        setModalVisible(false);
        try {
          await saveAddressOnly();
          await savePhoneOnly(fullPhone);
          showModal({
            title: "הצלחה",
            message: "הכתובת והטלפון נשמרו בפרופיל.",
            confirmText: "חזרה לדף הבית",
            onConfirm: () => navigate(homePath),
          });
        } catch (e) {
          showModal({
            title: "שגיאה",
            message: e.message,
            confirmText: "סגור",
            onConfirm: () => setModalVisible(false),
          });
        }
      },
    });
  }

  // ——— מודאל טלפוני בלבד לאיסוף עצמי ———
  function openSavePhoneOnlyModal(fullPhone) {
    showModal({
      title: "שמירת טלפון",
      message: "לשמור את הטלפון הזה בפרופיל שלך?",
      cancelText: "לא, תודה",
      confirmText: "כן, שמור",
      onCancel: () => {
        setModalVisible(false);
        showModal({
          title: "הושלם",
          message: "הפרטים נשמרו רק להזמנה הנוכחית.",
          confirmText: "חזרה לדף הבית",
          onConfirm: () => navigate(homePath),
        });
      },
      onConfirm: async () => {
        setModalVisible(false);
        try {
          await savePhoneOnly(fullPhone);
          showModal({
            title: "הצלחה",
            message: "הטלפון נשמר בפרופיל.",
            confirmText: "חזרה לדף הבית",
            onConfirm: () => navigate(homePath),
          });
        } catch (e) {
          showModal({
            title: "שגיאה",
            message: e.message,
            confirmText: "סגור",
            onConfirm: () => setModalVisible(false),
          });
        }
      },
    });
  }

  // שליחת הטופס
  const handleSubmit = async (e) => {
    e.preventDefault();

    // ולידציה לטלפון (נדרש תמיד)
    if (!isValidIlMobile(phonePrefix, phoneNumber)) {
      return showModal({
        title: "שגיאה",
        message: "יש להזין נייד תקין: קידומת +9725X ו-7 ספרות.",
        confirmText: "סגור",
        onConfirm: () => setModalVisible(false),
      });
    }

    try {
      const fullPhone = phonePrefix + phoneNumber;

      // משכפלים כדי לא לשבש state
      const addressToSend = { ...formData, phone: fullPhone };

      // אם איסוף עצמי – איפוס שדות כתובת (טלפון ו-notes נשארים)
      if (deliveryMethod === "pickup") {
        addressToSend.city = null;
        addressToSend.street = null;
        addressToSend.house_number = null;
        addressToSend.apartment_number = null;
        addressToSend.zip = null;
      }

      const data = await updateSaleAddress(id, deliveryMethod, addressToSend);

      if (!data.success) {
        return showModal({
          title: "שגיאה",
          message: data.message || "אירעה שגיאה בשליחת הפרטים.",
          confirmText: "סגור",
          onConfirm: () => setModalVisible(false),
        });
      }

      // אחרי הצלחה – לפתוח מודאל לפי סוג המשלוח
      if (deliveryMethod === "delivery") {
        openSaveChoicesModal(fullPhone); // 3 כפתורים
      } else {
        openSavePhoneOnlyModal(fullPhone); // רק טלפון
      }
    } catch (err) {
      showModal({
        title: "שגיאת רשת",
        message: "לא ניתן לשלוח את הפרטים לשרת.",
        confirmText: "סגור",
        onConfirm: () => setModalVisible(false),
      });
    }
  };

  // שליחת כתובת מגורים קיימת
  const handleUseSavedAddress = async () => {
    try {
      const data = await getUserSavedAddress(id);

      if (data.success && data.address) {
        const { city, street, house_number, apartment_number, zip, phone } =
          data.address;

        // עדכון כתובת
        setFormData((prev) => ({
          ...prev,
          city,
          street,
          house_number,
          apartment_number,
          zip,
        }));

        // פירוק טלפון שמור (אם יש)
        const parsed = parseIlMobile(phone);
        if (parsed) {
          setPhonePrefix(parsed.prefix);
          setPhoneNumber(parsed.number);
          setFormData((prev) => ({ ...prev, phone })); // שומר גם את המחרוזת המלאה
        } else {
          setPhoneNumber("");
          setFormData((prev) => ({ ...prev, phone: "" }));
        }

        // רענון רחובות
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
      const serverMessage =
        err?.response?.data?.message || "לא ניתן לשלוף את כתובת המגורים.";

      showModal({
        title: "שגיאה",
        message: serverMessage,
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

        {/* ——— טלפון בסגנון הפרופיל ——— */}
        <div className={styles.phoneRow}>
          <select
            value={phonePrefix}
            onChange={(e) => setPhonePrefix(e.target.value)}
            required
          >
            <option value="+97250">+972 50</option>
            <option value="+97252">+972 52</option>
            <option value="+97253">+972 53</option>
            <option value="+97254">+972 54</option>
            <option value="+97255">+972 55</option>
            <option value="+97256">+972 56</option>
            <option value="+97258">+972 58</option>
          </select>

          <input
            type="tel"
            autoComplete="tel"
            name="phone_ui_number" // לא נשלח, רק UI
            placeholder="7 ספרות"
            value={phoneNumber}
            inputMode="numeric"
            maxLength={7}
            onChange={(e) => {
              const onlyNums = e.target.value.replace(/\D/g, "");
              setPhoneNumber(onlyNums.slice(0, 7));
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
            className={phoneError ? styles.error : ""}
            required
          />
        </div>

        <textarea
          name="notes"
          placeholder="הערות למוכר (לא חובה)"
          value={formData.notes}
          onChange={handleChange}
        />

        <button
          className={styles.submitBtn}
          type="submit"
          disabled={!deliveryMethod}
        >
          שלח למוכר
        </button>
      </form>

      {modalVisible && (
        <CustomModal
          title={modalContent.title}
          message={modalContent.message}
          confirmText={modalContent.confirmText}
          cancelText={modalContent.cancelText}
          extraButtonText={modalContent.extraButtonText}  // 🆕
          onConfirm={modalContent.onConfirm || (() => setModalVisible(false))}
          onCancel={modalContent.onCancel || (() => setModalVisible(false))}
          onExtra={modalContent.onExtra || (() => setModalVisible(false))}     // 🆕
        />
      )}
    </div>
  );
}

export default ShippingForm;
