// src/pages/productPage/components/OrderDetails.jsx
// פרטי הזמנה: מציג נתוני המכירה לקונה/מוכר/אדמין (תאריך, מחיר, שיטת מסירה וכתובת),
// קובע סטטוס חכם (נשלח/נאסף/נמסר/חסר כתובת), מציג פרטי קשר בהתאם לצופה,
// ומספק כפתורי פעולה: למוכר סימון “נשלח/נאסף” (markProductAsSent) ולקונה סימון “נמסר/נאסף” (markProductDelivered).
// לאחר אישור קבלה פותח מודאל דירוג עם StarRater ושומר דירוג (rateSeller).
// כולל עדכון אופטימי, סנכרון props→state, ובדיקת חוסר כתובת במשלוח.

import React, { useEffect, useState } from "react";
import styles from "../ProductPage.module.css";
import { formatDateTimeHe } from "../utils/datetime";
import { markProductAsSent, markProductDelivered, rateSeller } from "../../../services/saleApi";
import CustomModal from "../../../components/CustomModal/CustomModal";
import StarRater from "../../../components/StarRater/StarRater";

/**
 * OrderDetails
 * רכיב תצוגת פרטי הזמנה/מכירה.
 *
 * אחריות:
 *  - מציג נתוני העסקה (תאריך זכייה, מחיר סופי, שיטת מסירה, כתובת, הערות).
 *  - מציג פרטי קשר בהתאם לתפקיד הצופה (קונה/מוכר/אדמין).
 *  - מחשב טקסט סטטוס דינמי לפי מצב המשלוח/איסוף.
 *  - מאפשר פעולות "נשלח/נאסף" (מוכר) ו"נמסר/נאסף" (קונה) עם עדכון אופטימי.
 *  - לאחר אישור מסירה ע"י הקונה — פותח מודאל דירוג ושומר את הדירוג.
 *
 * מקורות מידע לפרטי קשר:
 *  - מוכר: נלקח תחילה מ־sellerContact (אם ההוק סיפק), אחרת משדות seller_* ב־sale.
 *  - קונה: נלקח משדות phone / buyer_phone / buyer_email / buyer?.email מתוך ה־sale.
 *
 * הערות:
 *  - העדכון ל־sent/is_delivered מתבצע אופטימית ב־localSale כדי לתת פידבק מיידי,
 *    ובמקביל מתבצעת קריאה לשרת. על כשל — מתבצע rollback לערכי ה־props.
 *
 * @param {{
 *  sale: any,
 *  isWinner?: boolean,
 *  sellerView?: boolean,
 *  adminView?: boolean,
 *  sellerContact?: { phone?: string, email?: string }
 * }} props
 */
export default function OrderDetails({ sale, isWinner, sellerView, adminView, sellerContact }) {
  // --- state ---
  const [pending, setPending] = useState(false);     // ספינר/נעילה לפעולות רשת
  const [localSale, setLocalSale] = useState(sale || null); // עותק לוקלי לעדכון אופטימי

  // דירוג לאחר אישור מסירה ע"י הקונה
  const [rateOpen, setRateOpen] = useState(false);   // פתיחת מודאל דירוג
  const [rateValue, setRateValue] = useState(0);     // ערך הדירוג (1..5)
  const [savingRating, setSavingRating] = useState(false); // מניעת שליחה כפולה

  // --- סנכרון props -> state (אם ה־sale מתעדכן מבחוץ) ---
  useEffect(() => {
    setLocalSale(sale || null);
  }, [sale]);

  if (!localSale) return null;

  // ----- נירמול/גזירת שדות תצוגה -----
  const method      = String(localSale.delivery_method || "").toLowerCase(); // "delivery" | "pickup" | ""
  const shipped     = ["yes", "1", "true"].includes(String(localSale.sent).toLowerCase()); // האם סומן כנשלח/נאסף ע"י המוכר
  const delivered   = ["1", "true"].includes(String(localSale.is_delivered).toLowerCase()); // האם סומן "נמסר/נאסף" ע"י הקונה
  const winDateText = localSale.end_date ? formatDateTimeHe(localSale.end_date) : "-";
  const methodText  = method === "pickup" ? "איסוף עצמי" : "משלוח";

  // ----- פרטי קשר -----
  // מוכר (עדיפות לנתוני ההוק; אחרת שדות שמגיעים מה-API ברשומת ה-sale)
  const sellerPhone =
    sellerContact?.phone ??
    localSale.seller_phone ??
    localSale.sellerPhone ??
    localSale.product_owner_phone ??
    localSale.owner_phone ??
    localSale.seller?.phone ??
    null;

  const sellerEmail =
    sellerContact?.email ??
    localSale.seller_email ??
    localSale.sellerEmail ??
    localSale.product_owner_email ??
    localSale.owner_email ??
    localSale.seller?.email ??
    null;

  // קונה (טלפון/אימייל כפי שנשמרו ב-sale; ה־email עשוי להגיע מבקאנד ששודרג לצרף buyer_email)
  const buyerPhone =
    localSale.phone ??
    localSale.buyer_phone ??
    localSale.buyerPhone ??
    localSale.buyer?.phone ??
    null;

  const buyerEmail =
    localSale.email ??
    localSale.buyer_email ??
    localSale.buyerEmail ??
    localSale.buyer?.email ??
    null;

  // מי מוצג לצופה? (קונה רואה מוכר; מוכר/אדמין רואים קונה)
  let contactPhone, contactEmail;
  if (isWinner) {
    contactPhone = sellerPhone ?? "-";
    contactEmail = sellerEmail ?? "-";
  } else if (sellerView) {
    contactPhone = buyerPhone ?? "-";
    contactEmail = buyerEmail ?? "-";
  } else {
    contactPhone = buyerPhone ?? "-";
    contactEmail = buyerEmail ?? "-";
  }

  // ----- בדיקת חוסר כתובת כאשר שיטת המסירה היא משלוח -----
  const addressMissing =
    method === "delivery" &&
    ["country", "zip", "street", "house_number", "apartment_number"].some((f) => {
      const v = localSale?.[f];
      return v == null || String(v).trim() === "";
    });

  // ----- טקסט סטטוס לפי תפקיד וצמד הדגלים shipped/delivered -----
  let statusText;
  if (isWinner) {
    if (method === "delivery" && addressMissing && !delivered) {
      statusText = "נא למלא פרטי משלוח";
    } else if (method === "pickup" && !delivered) {
      statusText = shipped ? "המוכר אישר את איסוף המכירה — נא לחץ אישור מסירה" : "אישור מסירה";
    } else if (method === "pickup" && delivered) {
      statusText = "✅ המוצר נאסף";
    } else {
      statusText = delivered ? "✅ נמסר" : (shipped ? "📦 המוצר נשלח אלייך" : "⌛ ממתין לשליחת המוכר");
    }
  } else if (sellerView) {
    if (method === "delivery" && addressMissing && !delivered) {
      statusText = "הרוכש טרם מילא את פרטי המשלוח";
    } else if (method === "pickup") {
      statusText = delivered ? "✅ הקונה אסף את המוצר" : (shipped ? "סומן שנאסף, מחכה לאישור הרוכש" : "⌛ ממתין לאיסוף ע\"י הקונה");
    } else if (method === "delivery") {
      statusText = delivered ? "✅ המוצר סומן כנמסר" : (shipped ? "📦 המוצר נשלח על ידך" : "⌛ ממתין לשליחה שלך");
    }
  } else if (adminView) {
    if (method === "delivery" && addressMissing && !delivered) {
      statusText = "הרוכש טרם מילא את פרטי המשלוח";
    } else if (method === "pickup") {
      statusText = delivered ? "✅ הקונה אסף את המוצר" : (shipped ? "סומן שנאסף, מחכה לאישור הרוכש" : "⌛ ממתין לאיסוף הקונה");
    } else {
      statusText = delivered ? "✅ המוצר נמסר לקונה" : (shipped ? "📦 המוכר שלח את המוצר" : "⌛ ממתין שהמוכר ישלח את המוצר");
    }
  } else {
    statusText = "מכרז הסתיים";
  }

  // ----- פעולות (עם עדכון אופטימי + rollback על כשל רשת) -----

  // סימון שנשלח/נאסף ע"י המוכר: ב־delivery => "נשלח"; ב־pickup => "נאסף"
  const doMarkSent = async () => {
    if (pending) return;
    try {
      setPending(true);
      setLocalSale(prev => ({ ...prev, sent: "yes" })); // עדכון אופטימי
      await markProductAsSent(localSale.product_id);
    } catch {
      setLocalSale(sale || null); // rollback ל־props
      alert("שגיאה בעת סימון משלוח");
    } finally {
      setPending(false);
    }
  };

  // סימון נמסר/נאסף ע"י הקונה: לאחר מכן נפתח מודאל דירוג
  const doMarkDelivered = async () => {
    if (pending) return;
    try {
      setPending(true);
      setLocalSale(prev => ({ ...prev, is_delivered: 1 })); // עדכון אופטימי
      await markProductDelivered(localSale.product_id);

      if (isWinner) {
        setRateValue(0);
        setRateOpen(true); // פתיחת מודאל דירוג
      }
    } catch {
      setLocalSale(sale || null); // rollback ל־props
      alert("שגיאה בעת סימון נמסר/נאסף");
    } finally {
      setPending(false);
    }
  };

  // שליחת דירוג למוכר (אחרי שהקונה אישר קבלה)
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

  // ----- תצוגה -----
  return (
    <div className={styles.orderCard}>
      {/* כותרת הכרטיס: מותאמת אם הצופה הוא הזוכה */}
      <h3 className={styles.orderTitle}>{isWinner ? "פרטי ההזמנה שלך" : "פרטי ההזמנה"}</h3>

      {/* שדות מידע בסיסיים על העסקה */}
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

      {/* כתובת מלאה — רק במשלוח */}
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

      {/* פרטי קשר (טלפון + אימייל) בהתאם לתפקיד */}
      <div className={styles.orderRow}>
        <span className={styles.orderLabel}>טלפון ליצירת קשר:</span>
        <span>{contactPhone}</span>
      </div>
      <div className={styles.orderRow}>
        <span className={styles.orderLabel}>אימייל ליצירת קשר:</span>
        <span>{contactEmail || "-"}</span>
      </div>

      {/* הערות הקונה/המוכר */}
      <div className={styles.orderRow}>
        <span className={styles.orderLabel}>הערות:</span>
        <span>{localSale.notes || "-"}</span>
      </div>

      {/* כפתורי פעולה מותנים בתפקיד ובמצב */}
      <div className={styles.orderRow} style={{ gap: 8, flexWrap: "wrap" }}>
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

            {/* איסוף עצמי: המוכר מסמן "נאסף" (כלומר sent="yes") אם עדיין לא סומן */}
            {method === "pickup" && !shipped && (
              <button
                type="button"
                onClick={doMarkSent}
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
            {/* משלוח: הקונה מאשר "בוצע" רק אחרי שהמוכר סימן שנשלח */}
            {method === "delivery" && shipped && (
              <button
                type="button"
                onClick={doMarkDelivered}
                disabled={pending}
                className={`${styles.primaryBtn} ${styles.bidButton}`}
              >
                {pending ? "מעבד..." : "סמן כבוצע"}
              </button>
            )}
            {/* איסוף עצמי: הקונה מאשר שנאסף */}
            {method === "pickup" && (
              <button
                type="button"
                onClick={doMarkDelivered}
                disabled={pending}
                className={`${styles.primaryBtn} ${styles.bidButton}`}
              >
                {pending ? "מעבד..." : "סמן שנאסף"}
              </button>
            )}
          </>
        )}
      </div>

      {/* באדג' סטטוס מסכם */}
      <div className={styles.orderRow}>
        <span className={`${styles.badge} ${delivered ? styles.toneGreen : styles.toneAmber}`}>
          סטטוס: {statusText}
        </span>
      </div>

      {/* מודאל דירוג לאחר אישור קבלה ע"י הקונה */}
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
