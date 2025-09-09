// src/pages/productPage/views/UserGuestView.jsx

import React, { useState } from "react";
import ProductLayout from "../components/ui/ProductLayout";
import RegistrationBlock from "../components/RegistrationBlock";
import ReportIssue from "../components/ReportIssue";
import SellerRating from "../components/ui/SellerRating";
import styles from "../ProductPage.module.css";
import { formatCountdown } from "../utils/time";

/**
 * UserGuestView
 * תצוגת דף המוצר עבור משתמש רגיל/אורח שאינו זוכה ואינו המוכר.
 *
 * מה מוצג כאן:
 * 1) אם המכרז הסתיים (ואין ספירת תשלום ל־winner) – הודעה "לא זכית" + דירוג מוכר.
 * 2) אם המכרז פעיל/טרם החל – תיאור מוצר, מחיר, מידע על אופן המסירה (רק משלוח / משלוח+איסוף),
 *    לחצן להצגת כתובת איסוף (אם קיימת), שעון ספירה לתחילת מכירה, ומודול הרשמה למכירה.
 * 3) תמיד בסוף: דירוג המוכר וטופס דיווח על בעיה (ReportIssue).
 *
 * פרופס מרכזיים:
 * - product: אובייקט מוצר מלא (שם/תיאור/מחיר/מוכר).
 * - images: מערך תמונות ל־ProductLayout.
 * - status: סטטוס מנורמל של המוצר (לשימוש לוגי מחוץ לרכיב).
 * - isEnded: האם המכירה הסתיימה (לפי זמן/מכירה בפועל).
 * - derivedStatus: סטטוס לנראות (למשל awaiting_payment) כדי לא להציג "לא זכית".
 * - loading, sellerOption, pickupAddressText: מידע על אופציות המוכר (משלוח/איסוף).
 * - startCountdownSec, isLive: שעון לתחילת מכירה ודגל "מכירה מתקיימת".
 * - user, canRegister: נתוני משתמש ודגל הצגת בלוק הרשמה.
 * - openModal, askLogin, navigate: פעולות עזר לפתיחת מודאל/ניווט/התחברות.
 * - sellerRating: דירוג ממוצע של המוכר להצגה.
 */
export default function UserGuestView({
  product,
  images,
  status,
  isEnded,
  derivedStatus,
  loading,
  sellerOption,
  pickupAddressText,
  startCountdownSec,
  isLive,
  user,
  canRegister,
  openModal,
  askLogin,
  sellerRating,
  navigate,
}) {
  // הצגת/הסתרת כתובת איסוף (רלוונטי כאשר המוכר מאפשר pickup)
  const [showPickup, setShowPickup] = useState(false);

  return (
    <ProductLayout images={images}>
      {/* ----- מקרה: המכרז הסתיים (ואין מצב awaiting_payment לזוכה) ----- */}
      {isEnded && derivedStatus !== "awaiting_payment" ? (
        <>
          <h1>{product.product_name}</h1>
          <p className={styles.notice}>המכרז הסתיים — לא זכית במכרז זה.</p>
          <SellerRating rating={sellerRating} />
        </>
      ) : (
        /* ----- מקרה: המכרז חי/טרם התחיל ----- */
        <>
          <h1>{product.product_name}</h1>
          <p className={styles.description}>{product.description}</p>
          <p className={styles.price}>מחיר פתיחה: ₪{product.price}</p>

          {/* הודעות לגבי אופן מסירה (מוכר מאפשר רק משלוח / משלוח+איסוף) */}
          {!loading && sellerOption === "delivery" && (
            <p className={styles.infoNote}>
              מוצר זה ניתן <b>רק לשליחה</b>.
            </p>
          )}

          {!loading && sellerOption === "delivery+pickup" && (
            <div className={styles.infoNote}>
              מוצר זה ניתן <b>גם לשליחה וגם לאיסוף עצמי</b> מכתובת המוכר.
              <div style={{ marginTop: 8 }}>
                <button
                  type="button"
                  className={`${styles.linkLikeButton} ${showPickup ? styles.linkLikeButtonActive : ""}`}
                  onClick={() => setShowPickup((v) => !v)}
                >
                  הצג/הסתר כתובת המוכר
                </button>
                {showPickup && (
                  <div className={styles.pickupBox}>
                    {pickupAddressText || <small>(כתובת המוכר לא זמינה כרגע)</small>}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* שעון ספירה עד תחילת מכירה (אם טרם התחילה) */}
          {(startCountdownSec ?? 0) > 0 && (
            <p className={styles.countdown}>
              המכירה תחל בעוד {formatCountdown(startCountdownSec)}
            </p>
          )}

          {/* אינדיקציה שהמכירה מתקיימת עכשיו */}
          {isLive && (
            <p className={styles.countdown}>
              המכירה מתקיימת ברגעים אלו
            </p>
          )}

          {/* בלוק הרשמה: לא מציגים למוכר עצמו; מציגים רק אם אפשר להירשם */}
          {String(user?.id_number) !== String(product.seller_id_number) && canRegister && (
            <RegistrationBlock
              product={product}
              user={user}
              setUser={() => {}}       // אין צורך בעדכון state כאן – נשלח no-op
              navigate={navigate}
              openModal={openModal}
              onNeedLogin={() => askLogin()}
            />
          )}

          {/* רכיבי סיום: דירוג המוכר + דיווח על בעיה */}
          <SellerRating rating={sellerRating} />
          <ReportIssue user={user} productId={product.product_id} onNeedLogin={() => askLogin()} />
        </>
      )}
    </ProductLayout>
  );
}
