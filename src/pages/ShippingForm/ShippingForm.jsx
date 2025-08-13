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
  getSellerDeliveryOptions ,
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

function parseLocalIlMobile(raw) {
  if (!raw) return null;
  const cleaned = String(raw).replace(/\s|-/g, "");
  // תומך גם ב-052xxxxxxx וגם ב-05xxxxxxxx (חלק מהחברות 8/7 ספרות אחרי)
  const m = cleaned.match(/^0(5\d)(\d{7})$/);
  if (!m) return null;
  const operator = m[1]; // לדוגמה 52
  const last7 = m[2];
  return { prefix: `+972${operator}`, number: last7 };
}


function ShippingForm() {
  const { id } = useParams(); // מזהה המוצר
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const homePath = user?.role === "seller" ? "/seller" : "/buyer";
  const [sellerOption, setSellerOption] = useState("delivery");
  const [availableStreets, setAvailableStreets] = useState([]);
  const [deliveryMethod, setDeliveryMethod] = useState("delivery");
  const [loadingOption, setLoadingOption] = useState(true);

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

   const baseCities = citiesData.map((c) => (c.city ?? "").trim());
   const cityOptions =
    formData.city && !baseCities.includes(formData.city)
      ? [formData.city, ...baseCities]
      : baseCities;

      const norm = (s) => (s ?? "").trim();

  // טלפון בסגנון הפרופיל
  const [phonePrefix, setPhonePrefix] = useState("+97250");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneError, setPhoneError] = useState(false);
// רשימת קידומות "מוכרות"
const knownPrefixes = [
  "+97250","+97252","+97253","+97254","+97255","+97256","+97257","+97258","+97259"
];

// נבנה את רשימת האופציות להצגה: אם הקידומת מה־user לא קיימת — נוסיף אותה בתחילת הרשימה
const options = phonePrefix && !knownPrefixes.includes(phonePrefix)
  ? [phonePrefix, ...knownPrefixes]
  : knownPrefixes;

const sellerAllowsPickup = sellerOption === "delivery+pickup";


  //לראות מה המוכר בחר אם בחר רק משלוח או גם משלוח וגם איסוף עצמי 
useEffect(() => {
  async function loadSellerOption() {
    setLoadingOption(true);
    try {
      const { option } = await getSellerDeliveryOptions(id);
      setSellerOption(option);
      setDeliveryMethod("delivery");
    } catch {
      setSellerOption("delivery");
      setDeliveryMethod("delivery");
    } finally {
      setLoadingOption(false);
    }
  }
  loadSellerOption();
}, [id]);




  
  // טען ברירת מחדל מה־user בעת פתיחת הדף


useEffect(() => {
  (async () => {
    // 1) נסה מה-Context
    const fromCtx = parseIlMobile(user?.phone) || parseLocalIlMobile(user?.phone);
    if (fromCtx) {
      setPhonePrefix(fromCtx.prefix);
      setPhoneNumber(fromCtx.number);
      setFormData(prev => ({ ...prev, phone: fromCtx.prefix + fromCtx.number }));
      return;
    }

    // 2) נסה מהשרת
    try {
      const data = await getUserSavedAddress(id);
      const phone = data?.address?.phone;
      const parsed = parseIlMobile(phone) || parseLocalIlMobile(phone);
      if (parsed) {
        setPhonePrefix(parsed.prefix);
        setPhoneNumber(parsed.number);
        setFormData(prev => ({ ...prev, phone: parsed.prefix + parsed.number }));
        setUser(prev => {
          const merged = { ...(prev || {}), phone: parsed.prefix + parsed.number };
          localStorage.setItem("user", JSON.stringify(merged));
          return merged;
        });
      }
    } catch {}
  })();
}, [id, user?.phone, setUser]);


  // מודאל
const [modalVisible, setModalVisible] = useState(false);
const [modalContent, setModalContent] = useState({
  title: "",
  message: "",
  confirmText: "",
  cancelText: "",
  extraButtonText: "",
  skipText: "",
  onConfirm: null,
  onCancel: null,
  onExtra: null,
  onSkip: null,
  hideClose: false,            // 🆕
  disableBackdropClose: false, // 🆕
});

const showModal = ({
  title,
  message,
  confirmText,
  cancelText,
  extraButtonText,
  skipText,
  onConfirm,
  onCancel,
  onExtra,
  onSkip,
  hideClose = false,            // 🆕
  disableBackdropClose = false, // 🆕
}) => {
  setModalContent({
    title,
    message,
    confirmText,
    cancelText,
    extraButtonText,
    skipText,
    onConfirm,
    onCancel,
    onExtra,
    onSkip,
    hideClose,
    disableBackdropClose,
  });
  setModalVisible(true);
};




  // שינוי עיר
const handleCityChange = (e) => {
  const selected = e.target.value;
  const selectedNorm = norm(selected);

  const cityObj = citiesData.find((c) => norm(c.city) === selectedNorm);
  setAvailableStreets(cityObj ? cityObj.streets : []);

  setFormData((prev) => ({ ...prev, city: selectedNorm, street: "" }));
};


  // שינוי שדות רגילים
const handleChange = (e) => {
  const { name, value } = e.target;
  setFormData(prev => ({ ...prev, [name]: value }));
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



  // ——— מודאל 4 כפתורים למשלוח ———
function openSaveChoicesModal(fullPhone) {
  showModal({
    title: "שמירה לפרופיל",
    message: " פרטי המשלוח שמולאו נשלחו למוכר, מה תרצה לשמור לפרופיל שלך?",
    cancelText: "שמור כתובת בלבד",
    extraButtonText: "שמור טלפון בלבד",
    confirmText: "שמור כתובת וגם טלפון",
    skipText: "שמירת שינויים רק למשלוח הנוכחי",  // כפתור רביעי
        hideClose: true,              // 🆕 בלי X
    disableBackdropClose: true,   // 🆕 אין סגירה ברקע/ESC

    // 🆕 חלון אישור אחרי שמירה רק להזמנה

    onSkip: () => {
      setModalVisible(false);
      showModal({
        title: "הושלם",
        message: "הנתונים נשמרו רק למשלוח הנוכחי.",
        confirmText: "חזרה לדף הבית",
        onConfirm: () => navigate(homePath),
        onCancel: () => setModalVisible(false), // אופציונלי אם יש 'X'
      });
    },

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
      message: "נקלטה בקשתך לאסוף עצמאית את המוצר, לצפייה בפרטי כתובת המוכר גש לדף ההצעות שלי\n האם לשמור את הטלפון הזה בפרופיל שלך?",
      cancelText: "לא, תודה",
      confirmText: "כן, שמור",
          hideClose: true,              // 🆕 בלי X
    disableBackdropClose: true,   // 🆕 אין סגירה ברקע/ESC

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
  
// 🆕 סיכום ידידותי להצגה במודאל האישור
function formatSummary(deliveryMethod, data) {
  const lines = [];
  lines.push(`שיטת משלוח: ${deliveryMethod === "delivery" ? "משלוח עד הבית" : "איסוף עצמי"}`);

  if (deliveryMethod === "delivery") {
    lines.push(
      `עיר: ${data.city || "-"}`,
      `רחוב: ${data.street || "-"}`,
      `מס' בית: ${data.house_number || "-"}`,
      `מס' דירה: ${data.apartment_number || "-"}`,
      `מיקוד: ${data.zip || "-"}`
    );
  }

  // ריווח קטן לפני טלפון/הערות
  lines.push("");
  // הצגת טלפון בפורמט נעים
  const pp = (data.phone || "").slice(0, 5) === "+9725"
    ? data.phone.slice(0, 5) + data.phone.slice(5)
    : data.phone || "-";
  lines.push(`טלפון: ${pp || "-"}`);

  // הערות
  lines.push(`הערות למוכר: ${data.notes ? data.notes : "-"}`);

  return lines.join("\n");
}
const [isSubmitting, setIsSubmitting] = useState(false);

  // שליחת הטופס
// 🆕 שלב 2: שליחה אמיתית לאחר אישור
async function proceedSubmit(addressToSend, fullPhone) {
  if (isSubmitting) return;
  setIsSubmitting(true);
  try {
    const data = await updateSaleAddress(id, deliveryMethod, addressToSend);
    if (!data.success) {
      return showModal({ title:"שגיאה", message:data.message || "אירעה שגיאה בשליחת הפרטים.", confirmText:"סגור", onConfirm:()=>setModalVisible(false) });
    }
    if (deliveryMethod === "delivery") openSaveChoicesModal(fullPhone);
    else openSavePhoneOnlyModal(fullPhone);
  } catch {
    showModal({ title:"שגיאת רשת", message:"לא ניתן לשלוח את הפרטים לשרת.", confirmText:"סגור", onConfirm:()=>setModalVisible(false) });
  } finally {
    setIsSubmitting(false);
  }
}

// ✨ שלב 1: ולידציה + מודאל אישור (במקום לשלוח מיד)
const handleSubmit = async (e) => {
  e.preventDefault();

  // ולידציה לטלפון
  if (!isValidIlMobile(phonePrefix, phoneNumber)) {
    return showModal({
      title: "שגיאה",
      message: "יש להזין נייד תקין: קידומת +9725X ו-7 ספרות.",
      confirmText: "סגור",
      onConfirm: () => setModalVisible(false),
    });
  }

  const fullPhone = phonePrefix + phoneNumber;

  // משכפלים כדי לא לשבש state
  const addressToSend = { ...formData, phone: fullPhone };

  // אם איסוף עצמי — לא שולחים שדות כתובת
  if (deliveryMethod === "pickup") {
    addressToSend.city = null;
    addressToSend.street = null;
    addressToSend.house_number = null;
    addressToSend.apartment_number = null;
    addressToSend.zip = null;
  }

  // 🆕 פתיחת מודאל אישור עם סיכום הפרטים
  const summary = formatSummary(deliveryMethod, addressToSend);
  showModal({
    title: "אישור פרטים",
    message: `אנא אשר/י שהפרטים נכונים:\n\n${summary}\n\nהאם לאשר ולשלוח?`,
    confirmText: "כן, הפרטים נכונים",
    cancelText: "לא, ערוך",
    onConfirm: () => {
      setModalVisible(false);
      // ממשיכים לשלב 2: שליחה אמיתית
      proceedSubmit(addressToSend, fullPhone);
    },
    onCancel: () => {
      // רק לסגור — לא לשלוח ולא לשנות כלום
      setModalVisible(false);
    },
  });
};


  console.log("בחירת משלוח של מוכר" ,sellerOption )
  
  // שליחת כתובת מגורים קיימת
const handleUseSavedAddress = async () => {
  try {
    const data = await getUserSavedAddress(id);

    if (data.success && data.address) {
      let { city, street, house_number, apartment_number, zip, phone } = data.address;

      // נרמול
      city = norm(city);
      street = norm(street);

      // עדכון הכתובת לטופס
      setFormData((prev) => ({
        ...prev,
        city,
        street,
        house_number,
        apartment_number,
        zip,
      }));

      // רענון רשימת הרחובות לפי העיר שנבחרה
const cityObj = citiesData.find((c) => norm(c.city) === city);
const baseStreets = cityObj ? cityObj.streets : [];
const streetsWithSaved =
  street && !baseStreets.includes(street) ? [street, ...baseStreets] : baseStreets;

      setAvailableStreets(streetsWithSaved);

      // טלפון (אם קיים בפרופיל)
     // טלפון (אם קיים בפרופיל)
const parsedPhone = parseIlMobile(phone) || parseLocalIlMobile(phone);
if (parsedPhone) {
  const full = parsedPhone.prefix + parsedPhone.number;
  setPhonePrefix(parsedPhone.prefix);
  setPhoneNumber(parsedPhone.number);
  setFormData((prev) => ({ ...prev, phone: full }));
}
// אם לא parsed — לא מאפסים כלום, משאירים את מה שכבר היה ב־UI

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
    {loadingOption ? (
      <p>טוען אפשרויות משלוח…</p>
    ) : (
      <>
        {/* בחירת שיטת משלוח לפי sellerOption */}
{/* בחירת שיטת משלוח לפי sellerOption */}
{sellerAllowsPickup ? (
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
) : sellerOption === "delivery" ? (
  <div className={styles.deliveryOnlyNote}>
    <input type="hidden" name="delivery_method" value="delivery" />
    <p>המוכר מאפשר משלוח עד הבית בלבד.</p>
  </div>
) : null}


        {deliveryMethod === "delivery" && sellerOption && (
          <>
            <h3>נא למלא כתובת למשלוח</h3>
            <button
              className={styles.useSavedBtn}
              type="button"
              onClick={handleUseSavedAddress}
            >
              השתמש בכתובת המגורים שלי
            </button>
          </>
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
       {cityOptions.map((name, i) => (
  <option key={`${name}-${i}`} value={name}>
    {name}
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

         {/* טלפון */}
          <div className={styles.phoneRow}>
            <select
              value={phonePrefix}
              onChange={(e) => setPhonePrefix(e.target.value)}
              required
            >
              {options.map((p) => (
                <option key={p} value={p}>
                  {p.replace("+972", "+972 ")}
                </option>
              ))}
            </select>

            <input
              type="tel"
              autoComplete="tel"
              name="phone_ui_number"
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
                if (phoneNumber === "") return setPhoneError(false);
                setPhoneError(!isValidIlMobile(phonePrefix, phoneNumber));
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

<button className={styles.submitBtn} type="submit" disabled={!deliveryMethod || isSubmitting}>
  {isSubmitting ? "שולח..." : "שלח למוכר"}
</button>
        </form>
      </>
    )}

{modalVisible && (
  <CustomModal
    title={modalContent.title}
    message={modalContent.message}
    confirmText={modalContent.confirmText}
    cancelText={modalContent.cancelText}
    extraButtonText={modalContent.extraButtonText}
    skipText={modalContent.skipText}
    onConfirm={modalContent.onConfirm || (() => setModalVisible(false))}
    onCancel={modalContent.onCancel || (() => setModalVisible(false))}
    onExtra={modalContent.onExtra || (() => setModalVisible(false))}
    onSkip={modalContent.onSkip || (() => setModalVisible(false))}
    onClose={() => setModalVisible(false)}
    hideClose={modalContent.hideClose}                    // 🆕
    disableBackdropClose={modalContent.disableBackdropClose}  // 🆕
  />
)}



  </div>
);
}

export default ShippingForm;
