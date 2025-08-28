// src/pages/productPage/components/OrderDetails.jsx
import React, { useEffect, useState } from "react";
import styles from "../ProductPage.module.css";
import { formatDateTimeHe } from "../utils/datetime";
import { markProductAsSent, markProductDelivered, rateSeller } from "../../../services/saleApi";
import CustomModal from "../../../components/CustomModal/CustomModal";
import StarRater from "../../../components/StarRater/StarRater";

export default function OrderDetails({ sale, isWinner, sellerView, adminView }) {
  // --- Hooks first ---
  const [pending, setPending] = useState(false);
  const [localSale, setLocalSale] = useState(sale || null);

  // דירוג לאחר אישור מסירה ע"י הקונה
  const [rateOpen, setRateOpen] = useState(false);
  const [rateValue, setRateValue] = useState(0);
  const [savingRating, setSavingRating] = useState(false);

  useEffect(() => {
    setLocalSale(sale || null);
  }, [sale]);

  if (!localSale) return null;

  // ----- נירמול שדות -----
  const method      = String(localSale.delivery_method || "").toLowerCase(); // "delivery" | "pickup" | ""
  const shipped     = ["yes", "1", "true"].includes(String(localSale.sent).toLowerCase());
  const delivered   = ["1", "true"].includes(String(localSale.is_delivered).toLowerCase());
  const winDateText = localSale.end_date ? formatDateTimeHe(localSale.end_date) : "-";
  const methodText  = method === "pickup" ? "איסוף עצמי" : "משלוח";

  // ----- האם חסרים פרטי משלוח כששיטה היא משלוח? -----
  const addressMissing =
    method === "delivery" &&
    ["country", "zip", "street", "house_number", "apartment_number"].some((f) => {
      const v = localSale?.[f];
      return v == null || String(v).trim() === "";
    });

  // ----- טקסט סטטוס לפי צופה -----
  let statusText;
if (isWinner) {
  // זוכה (קונה)
  if (method === "delivery" && addressMissing && !delivered) {
    statusText = "נא למלא פרטי משלוח";
  } else if (method === "pickup" && !delivered) {
    statusText = shipped
      ? "המוכר אישר את איסוף המכירה — נא לחץ אישור מסירה"
      : "אישור מסירה";
  } else if (method === "pickup" && delivered) {
    statusText = "✅ המוצר נאסף";
  } else {
    // delivery רגיל
    statusText = delivered
      ? "✅ נמסר"
      : (shipped ? "📦 המוצר נשלח אלייך" : "⌛ ממתין לשליחת המוכר");
  }
} else if (sellerView) {
  // מוכר
  if (method === "delivery" && addressMissing && !delivered) {
    statusText = "הרוכש טרם מילא את פרטי המשלוח";
  } else if (method === "pickup") {
    statusText = delivered
      ? "✅ הקונה אסף את המוצר"
      : shipped
        ? "סומן שנאסף, מחכה לאישור הרוכש"
        : '⌛ ממתין לאיסוף ע"י הקונה';
  } else if (method === "delivery") {
    statusText = delivered
      ? "✅ המוצר סומן כנמסר"
      : shipped
        ? "📦 המוצר נשלח על ידך"
        : "⌛ ממתין לשליחה שלך";
  }
} else if (adminView) {
  // מנהל (סיכום ניטרלי)
  if (method === "delivery" && addressMissing && !delivered) {
    statusText = "הרוכש טרם מילא את פרטי המשלוח";
  } else if (method === "pickup") {
    statusText = delivered
      ? "✅ הקונה אסף את המוצר"
      : shipped
        ? "סומן שנאסף, מחכה לאישור הרוכש"
        : "⌛ ממתין לאיסוף הקונה";
  } else {
    statusText = delivered
      ? "✅ המוצר נמסר לקונה"
      : shipped
        ? "📦 המוכר שלח את המוצר"
        : "⌛ ממתין שהמוכר ישלח את המוצר";
  }
} else {
  statusText = "מכרז הסתיים";
}

  // ----- פעולות -----
  const doMarkSent = async () => {
    if (pending) return;
    try {
      setPending(true);
      setLocalSale(prev => ({ ...prev, sent: "yes" })); // עדכון אופטימי
      await markProductAsSent(localSale.product_id);
    } catch {
      setLocalSale(sale || null); // rollback
      alert("שגיאה בעת סימון משלוח");
    } finally {
      setPending(false);
    }
  };

  const doMarkDelivered = async () => {
    if (pending) return;
    try {
      setPending(true);
      setLocalSale(prev => ({ ...prev, is_delivered: 1 })); // עדכון אופטימי
      await markProductDelivered(localSale.product_id);

      // פתיחת דירוג – כמו ב־MyBidsPage
      if (isWinner) {
        setRateValue(0);
        setRateOpen(true);
      }
    } catch {
      setLocalSale(sale || null); // rollback
      alert("שגיאה בעת סימון נמסר/נאסף");
    } finally {
      setPending(false);
    }
  };

  const submitRating = async () => {
    if (!rateValue) return;
    try {
      setSavingRating(true);
      await rateSeller(localSale.product_id, rateValue);
      setRateOpen(false);
    } catch {
      alert("לא ניתן לשמור דירוג כרגע");
    } finally {
      setSavingRating(false);
    }
  };

  return (
    <div className={styles.orderCard}>
      <h3 className={styles.orderTitle}>{isWinner ? "פרטי ההזמנה שלך" : "פרטי ההזמנה"}</h3>

      <div className={styles.orderRow}>
        <span className={styles.orderLabel}>תאריך זכייה:</span>
        <span>{winDateText}</span>
      </div>

      <div className={styles.orderRow}>
        <span className={styles.orderLabel}>מחיר סופי:</span>
        <span>{localSale.final_price ? `${localSale.final_price} ₪` : "-"}</span>
      </div>

      <div className={styles.orderRow}>
        <span className={styles.orderLabel}>שיטת מסירה:</span>
        <span>{methodText}</span>
      </div>

      {method === "delivery" && (
        <>
          <div className={styles.orderRow}><span className={styles.orderLabel}>עיר:</span><span>{localSale.city || "-"}</span></div>
          <div className={styles.orderRow}><span className={styles.orderLabel}>רחוב:</span><span>{localSale.street || "-"}</span></div>
          <div className={styles.orderRow}>
            <span className={styles.orderLabel}>מס' בית / דירה:</span>
            <span>{(localSale.house_number || "-")}/{localSale.apartment_number ?? "-"}</span>
          </div>
          <div className={styles.orderRow}><span className={styles.orderLabel}>מיקוד:</span><span>{localSale.zip || "-"}</span></div>
          <div className={styles.orderRow}><span className={styles.orderLabel}>מדינה:</span><span>{localSale.country || "-"}</span></div>
        </>
      )}

      <div className={styles.orderRow}>
        <span className={styles.orderLabel}>טלפון ליצירת קשר:</span>
        <span>{localSale.phone || "-"}</span>
      </div>

      <div className={styles.orderRow}>
        <span className={styles.orderLabel}>הערות:</span>
        <span>{localSale.notes || "-"}</span>
      </div>

      {/* כפתורי פעולה לפי תפקיד */}
      <div className={styles.orderRow} style={{ gap: 8, flexWrap: "wrap" }}>
        {/* מוכר */}
{/* מוכר */}
{sellerView && !delivered && (
  <>
    {/* משלוח: "נשלח" רק אם הכתובת מלאה וטרם נשלח */}
    {method === "delivery" && !addressMissing && !shipped && (
      <button
        type="button"
        onClick={doMarkSent}
        disabled={pending}
        className={`${styles.primaryBtn} ${styles.bidButton}`}
      >
        {pending ? "מעבד..." : "סימון שהמוצר נשלח"}
      </button>
    )}

    {/* PICKUP: המוכר מסמן "נאסף" => sent="yes"  (רק אם עדיין לא סומן) */}
    {method === "pickup" && !shipped && (
      <button
        type="button"
        onClick={doMarkSent}  // שים לב: doMarkSent (לא doMarkDelivered)
        disabled={pending}
        className={`${styles.primaryBtn} ${styles.bidButton}`}
      >
        {pending ? "מעבד..." : "סימון שהמוצר נאסף"}
      </button>
    )}
  </>
)}


        {/* קונה זוכה */}
        {isWinner && !delivered && (
          <>
            {method === "delivery" && shipped && (
              <button
                type="button"
                onClick={doMarkDelivered}
                disabled={pending}
                className={styles.primaryBtn || styles.bidButton}
              >
                {pending ? "מעבד..." : "סמן כבוצע"}
              </button>
            )}
            {method === "pickup" && (
              <button
                type="button"
                onClick={doMarkDelivered}
                disabled={pending}
                className={styles.primaryBtn || styles.bidButton}
              >
                {pending ? "מעבד..." : "סמן שנאסף"}
              </button>
            )}
          </>
        )}
      </div>

      <div className={styles.orderRow}>
        <span className={`${styles.badge} ${delivered ? styles.toneGreen : styles.toneAmber}`}>
          סטטוס: {statusText}
        </span>
      </div>

      {/* מודאל דירוג לאחר אישור קבלה */}
      {rateOpen && (
        <CustomModal
          title="דרג את המוכר"
          confirmText={savingRating ? "שולח..." : "שלח דירוג"}
          cancelText="ביטול"
          onCancel={() => { setRateOpen(false); setRateValue(0); }}
          onConfirm={submitRating}
          onClose={() => { setRateOpen(false); setRateValue(0); }}
          confirmDisabled={savingRating || !rateValue}
          disableBackdropClose={false}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <p style={{ marginBottom: 12 }}>בחר דירוג:</p>
            <StarRater value={rateValue} onChange={setRateValue} size={32} spacing={10} />
          </div>
        </CustomModal>
      )}
    </div>
  );
}
