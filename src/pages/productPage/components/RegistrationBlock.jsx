// src/pages/ProductPage/components/RegistrationBlock.jsx
import React, { useEffect, useState } from "react";
import styles from "../ProductPage.module.css";
import {
  getQuotationsByProductId,
  registerToQuotation,
  cancelQuotationRegistration,
} from "../../../services/quotationApi";
import { uploadIdCard } from "../../../services/authApi";
import { durationToMinutesDisplay, formatCountdown } from "../utils/time";
import { formatDate, formatTime } from "../utils/datetime";
//הרשמה/ביטול/מעבר ללייב למשתמשים שאינם הבעלים/אדמין
export default function RegistrationBlock({ product, user, setUser, onNeedLogin, navigate, openModal }) {
  const [isRegistered, setIsRegistered] = useState(false);
  const [showIdForm, setShowIdForm] = useState(false);
  const [idNumberInput, setIdNumberInput] = useState("");
  const [idPhotoFile, setIdPhotoFile] = useState(null);
  const [showIdError, setShowIdError] = useState(false);

  const isAdmin = user?.role === "admin";
  const isOwner =
    user?.id_number &&
    product?.seller_id_number &&
    String(user.id_number) === String(product.seller_id_number);

  // ספירה עד ההתחלה – מציבים את ה־state לפני ה־effect
  const [startCountdownSec, setStartCountdownSec] = useState(null);
  useEffect(() => {
    if (!product?.start_date) {
      setStartCountdownSec(null);
      return;
    }
    const start = new Date(product.start_date).getTime();
    const tick = () =>
      setStartCountdownSec(Math.max(Math.floor((start - Date.now()) / 1000), 0));
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [product?.start_date]);

  // בדיקת הרשמה קיימת (ללא מודאל – רק לוג)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!user?.id_number || !product?.product_id) return;
        const data = await getQuotationsByProductId(product.product_id);
        const already =
          Array.isArray(data) &&
          data.some(
            (q) =>
              String(q.buyer_id_number) === String(user.id_number) &&
              Number(q.price) === 0
          );
        if (alive) setIsRegistered(Boolean(already));
      } catch (e) {
        if (alive) setIsRegistered(false);
        console.warn("getQuotationsByProductId failed:", e?.message || e);
      }
    })();
    return () => {
      alive = false;
    };
  }, [product?.product_id, user?.id_number]);

  const completeRegistration = async (idNum) => {
    try {
      const productId = product?.product_id;
      const res = await registerToQuotation(productId, idNum);
      const dateStr = product?.start_date ? formatDate(product.start_date) : "";
      const timeStr = product?.start_date ? formatTime(product.start_date) : "";

      if (res.success || res.message === "כבר נרשמת למכירה הזו") {
        setIsRegistered(true);
        setShowIdForm(false);
        openModal?.({
          title: res.success ? "נרשמת!" : "כבר נרשמת!",
          message: dateStr
            ? `המכירה תחל בתאריך ${dateStr} בשעה ${timeStr}`
            : "נרשמת למכירה בהצלחה.",
          confirmText: "אישור",
        });
      } else {
        throw new Error(res.message || "שגיאה");
      }
    } catch {
      openModal?.({
        title: "שגיאה",
        message: "שגיאה בעת ניסיון ההרשמה למכרז",
        confirmText: "סגור",
      });
    }
  };

  const handleRegisterClick = () => {
    if (!user?.email) return onNeedLogin?.(); // צריך התחברות
    if (!user.id_number || !user.id_card_photo) setShowIdForm(true); // צריך KYC
    else completeRegistration(user.id_number); // יש KYC
  };

  const handleIdChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, "");
    setIdNumberInput(digitsOnly);
    if (showIdError && digitsOnly.length === 9) setShowIdError(false);
  };

  const handleIdSubmit = async (e) => {
    e.preventDefault();
    const digits = String(idNumberInput || "").replace(/\D/g, "");
    if (digits.length !== 9) {
      setShowIdError(true);
      return;
    }
    if (!idPhotoFile) {
      openModal?.({
        title: "שגיאה",
        message: "נא לצרף צילום תעודת זהות",
        confirmText: "סגור",
      });
      return;
    }
    try {
      await uploadIdCard({ idNumber: digits, idPhotoFile, email: user.email });
      setUser?.({ ...user, id_number: digits, id_card_photo: "uploaded" });
      setShowIdForm(false);
      completeRegistration(digits);
    } catch {
      openModal?.({
        title: "שגיאה",
        message: "שגיאה בשמירת תעודת זהות",
        confirmText: "סגור",
      });
    }
  };

  const handleCancelRegistration = async () => {
    try {
      await cancelQuotationRegistration(product.product_id, user.id_number);
      setIsRegistered(false);
      openModal?.({
        title: "הוסרה ההרשמה",
        message: "הוסרת מהמכרז בהצלחה",
        confirmText: "סגור",
      });
    } catch {
      openModal?.({
        title: "שגיאה",
        message: "שגיאה בהסרת ההשתתפות",
        confirmText: "סגור",
      });
    }
  };

  const isIdInvalidAfterSubmit =
    showIdError && String(idNumberInput || "").replace(/\D/g, "").length !== 9;

  // אחרי שכל ה-hooks הוגדרו — מחליטים אם להסתיר את הבלוק
  if (isAdmin || isOwner) return null;

  return (
    <>
      

      <p className={styles.status}>
        זמן המכירה למוצר זה הוא {durationToMinutesDisplay(product.end_time)} דקות
      </p>

      {isRegistered ? (
        <p className={styles.success}>נרשמת למכירה זו!</p>
      ) : (
        <button className={styles.bidButton} onClick={handleRegisterClick}>
          {user ? "הירשם/י למכירה" : "התחבר/י והירשם/י למכירה"}
        </button>
      )}

      {showIdForm && (
        <form onSubmit={handleIdSubmit} className={styles.idForm} dir="rtl">
          <h3>נא להזין תעודת זהות ולצרף תמונה</h3>

          <label>
            מספר תעודת זהות:
            <input
              type="text"
              value={idNumberInput}
              onChange={handleIdChange}
              inputMode="numeric"
              pattern="\d*"
              aria-invalid={isIdInvalidAfterSubmit}
              aria-describedby="id-error"
              style={{ direction: "ltr" }}
              required
            />
          </label>

          {isIdInvalidAfterSubmit && (
            <small
              id="id-error"
              style={{ color: "#d00", fontSize: 12, marginTop: 4, display: "block" }}
            >
              מספר תעודת זהות חייב להכיל 9 ספרות
            </small>
          )}

          <label>
            העלאת צילום תעודת זהות:
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setIdPhotoFile(e.target.files[0])}
              required
            />
          </label>

          <button type="submit">שלח ואשר הרשמה</button>
        </form>
      )}

      {isRegistered && (
        <>
          <button className={styles.cancelButton} onClick={handleCancelRegistration}>
            הסרה מהמכרז
          </button>
          <button
            className={styles.bidButton}
            onClick={() => navigate(`/live-auction/${product.product_id}`)}
          >
            למעבר למכירה הפומבית לחץ כאן!
          </button>
        </>
      )}
    </>
  );
}
