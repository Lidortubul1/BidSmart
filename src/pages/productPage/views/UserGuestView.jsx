// src/pages/productPage/views/UserGuestView.jsx

import React, { useState } from "react"; // ← הסרתי useEffect
import ProductLayout from "../components/ui/ProductLayout";
import RegistrationBlock from "../components/RegistrationBlock";
import ReportIssue from "../components/ReportIssue";
import SellerRating from "../components/ui/SellerRating";
import styles from "../ProductPage.module.css";
import { formatCountdown } from "../utils/time";

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
  onAttemptRegister, // ← חדש: מתקבל מה-ProductPage
}) {
  const [showPickup, setShowPickup] = useState(false);
  const isOwner = String(user?.id_number) === String(product.seller_id_number);

  return (
    <ProductLayout images={images}>
      <div className={`${styles.details} ${styles.textWrap} ${styles.blockGap}`}>
        {isEnded && derivedStatus !== "awaiting_payment" ? (
          <>
            <h1 className={styles.productTitle}>{product.product_name}</h1>
            <p className={styles.textNote}>המכרז הסתיים — לא זכית במכרז זה.</p>
            <SellerRating rating={sellerRating} />
          </>
        ) : (
          <>
            <h1 className={styles.productTitle}>{product.product_name}</h1>

            {product.description && (
              <p className={styles.description}>{product.description}</p>
            )}

            <p className={styles.priceText}>מחיר פתיחה: ₪{product.price}</p>

            {!loading && sellerOption === "delivery" && (
              <p className={styles.textNote}>
                מוצר זה ניתן <b>רק לשליחה</b>.
              </p>
            )}

            {!loading && sellerOption === "delivery+pickup" && (
              <div className={styles.textNote}>
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
                    <div className={styles.pickupBox} style={{ marginTop: 8 }}>
                      {pickupAddressText || <small>(כתובת המוכר לא זמינה כרגע)</small>}
                    </div>
                  )}
                </div>
              </div>
            )}

            {(startCountdownSec ?? 0) > 0 && (
              <p className={styles.countdown}>
                המכירה תחל בעוד {formatCountdown(startCountdownSec)}
              </p>
            )}

            {isLive && (
              <p className={styles.statusText}>
                <span className={`${styles.inlineBadge} ${styles["inlineBadge--warn"]}`}>LIVE</span>
                <span className={styles.statusLiveText}>  המכירה מתקיימת עכשיו</span>
              </p>
            )}

            {/* בלוק הרשמה – רק אם אינו הבעלים ומותר להירשם */}
            {!isOwner && canRegister && (
              <RegistrationBlock
                product={product}
                user={user}
                setUser={() => {}}
                navigate={navigate}
                openModal={openModal}
                onNeedLogin={() => askLogin()}
                onAttemptRegister={onAttemptRegister}  // ← מעבירים להורה לסימון ניסיון הרשמה
              />
            )}

            <SellerRating rating={sellerRating} />
            <ReportIssue user={user} productId={product.product_id} onNeedLogin={() => askLogin()} />
          </>
        )}
      </div>
    </ProductLayout>
  );
}
