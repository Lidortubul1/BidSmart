// src/pages/ProductPage/components/RegistrationBlock.jsx

import React, { useCallback, useEffect, useRef, useState } from "react";
import styles from "../ProductPage.module.css";
import {
  getQuotationsByProductId,
  registerToQuotation,
  cancelQuotationRegistration,
} from "../../../services/quotationApi";
import { uploadIdCard, getCurrentUser } from "../../../services/authApi";
import { formatDate, formatTime } from "../utils/datetime";

export default function RegistrationBlock({
  product,
  user,
  setUser,
  onNeedLogin,
  navigate,
  openModal,
  onAttemptRegister,
  shouldAutoRegister,
  onAutoHandled,
}) {
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

  // אם המשתמש מחובר אבל חסר לו id_number/id_card_photo – נמשוך סשן טרי ונעדכן Context
  useEffect(() => {
    if (!user?.email) return;
    if (user?.id_number && user?.id_card_photo) return;
    (async () => {
      try {
        const fresh = await getCurrentUser();
        if (fresh?.id_number || fresh?.id_card_photo) {
          setUser?.(fresh);
        }
      } catch {}
    })();
  }, [user?.email, user?.id_number, user?.id_card_photo, setUser]);

  const completeRegistration = useCallback(async (idNum) => {
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
  }, [product?.product_id, product?.start_date, openModal]);

  // ⬇️ עטיפה ב-useCallback כדי שה-effect למטה יוכל לתלות בה נקייה
  const handleRegisterClick = useCallback(async () => {
    if (!user?.email) {
      onAttemptRegister?.();
      onNeedLogin?.();
      return;
    }
    if (isOwner) {
      openModal?.({
        title: "פעולה לא אפשרית",
        message: "לא ניתן להירשם למוצר שהעלית.",
        confirmText: "הבנתי",
      });
      return;
    }

    let finalUser = user;
    if (!user.id_number || !user.id_card_photo) {
      try {
        const fresh = await getCurrentUser();
        if (fresh) {
          setUser?.(fresh);
          finalUser = fresh;
        }
      } catch {}
    }
    if (!finalUser.id_number || !finalUser.id_card_photo) {
      setShowIdForm(true);
    } else {
      completeRegistration(finalUser.id_number);
    }
  }, [
    user,
    isOwner,
    onAttemptRegister,
    onNeedLogin,
    openModal,
    setUser,
    completeRegistration,
  ]);

  // לא לתלות ב-onAutoHandled ישירות – נשמור אותה ב-ref
  const onAutoHandledRef = useRef(onAutoHandled);

  useEffect(() => {
    onAutoHandledRef.current = onAutoHandled;
  }, [onAutoHandled]);

  // אוטו־רישום אחרי התחברות מדף המוצר
  useEffect(() => {
    if (!shouldAutoRegister) return;
    if (isAdmin || isOwner) {
      onAutoHandledRef.current?.();
      return;
    }
    handleRegisterClick().finally(() => onAutoHandledRef.current?.());
  }, [shouldAutoRegister, isAdmin, isOwner, handleRegisterClick]);

  // בדיקת "כבר נרשמת" להצגת טקסט מתאים בכניסה לעמוד
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!product?.product_id) return;
        if (!user?.id_number) return;
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
      const res = await uploadIdCard({
        idNumber: digits,
        idPhotoFile,
        email: user.email,
      });
      if (res?.user) setUser?.(res.user);
      setShowIdForm(false);
      completeRegistration(res?.user?.id_number || digits);
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

  // לא מציגים בלוק אם אדמין/בעלים
  if (isAdmin || isOwner) return null;

  return (
    <>
      {isRegistered ? (
        <>
          <p className={styles.success}>נרשמת למכירה זו!</p>
          <div className={styles.actionsRow}>
            <button className={styles.cancelButton} onClick={handleCancelRegistration}>
              הסרה מהמכרז
            </button>
            <button
              className={styles.bidButton}
              onClick={() => navigate(`/live-auction/${product.product_id}`)}
            >
              למעבר למכירה הפומבית לחץ כאן!
            </button>
          </div>
        </>
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
    </>
  );
}
