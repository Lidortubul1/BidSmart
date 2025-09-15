// src/pages/productPage/views/UserGuestView.jsx
import React, { useState } from "react";
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
  setUser,
  canRegister,
  openModal,
  askLogin,
  sellerRating,
  navigate,
  onAttemptRegister,
  shouldAutoRegister,
  clearAttempt,
  adminPanel,
  openLoginDirect,   // ← חדש
  goRegister,        // ← חדש
}) {
  const [showPickup, setShowPickup] = useState(false);

  const userId = user?.id_number != null ? String(user.id_number) : null;
  const sellerId = product?.seller_id_number != null ? String(product.seller_id_number) : null;
  const isOwner = userId && sellerId && userId === sellerId;
  const isAdmin = user?.role === "admin";

  return (
    <ProductLayout images={images} adminPanel={adminPanel}>
      <div className={`${styles.textWrap} ${styles.blockGap}`}>
        {isEnded && derivedStatus !== "awaiting_payment" ? (
          <div className={styles.infoSection}>
            <h1 className={styles.productTitle}>{product.product_name}</h1>
            <p className={styles.textNote}>המכרז הסתיים — לא זכית במכרז זה.</p>
            <SellerRating rating={sellerRating} />
          </div>
        ) : (
          <>
            {/* פרטי המוצר – בכרטיס אחד */}
            <div className={styles.infoSection}>
              <h1 className={styles.productTitle}>{product.product_name}</h1>

              {product.description && (
                <p className={styles.description}>{product.description}</p>
              )}

              <p className={styles.priceText}>מחיר פתיחה: ₪{product.price} </p>
              
              {(startCountdownSec ?? 0) > 0 && (
                <p className={styles.countdown}>
                  המכירה תחל בעוד {formatCountdown(startCountdownSec)}
                </p>
              )}
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



              {isLive && (
                <p className={styles.statusText}>
                  <span className={`${styles.inlineBadge} ${styles["inlineBadge--warn"]}`}>LIVE</span>
                  <span className={styles.statusLiveText}>  המכירה מתקיימת עכשיו</span>
                </p>
              )}

              {/* דירוג מוכר כחלק מפרטי המוצר */}
              <SellerRating rating={sellerRating} />
            </div>

            {/* כפתורי הפעולה – מתחת לכרטיס */}
            <div className={styles.ctaWrap}>
              {!isOwner && canRegister && (
                <RegistrationBlock
                  product={product}
                  user={user}
                  setUser={setUser}
                  navigate={navigate}
                  openModal={openModal}
                  onNeedLogin={() => askLogin()}
                  onAttemptRegister={onAttemptRegister}
                  shouldAutoRegister={shouldAutoRegister}
                  onAutoHandled={clearAttempt}
                />
              )}
            </div>

            {/* כפתור “נתקלת בבעיה?” נשאר כפי שהוא (מחוץ לכרטיס) */}
            {!isAdmin && (
              <ReportIssue
                user={user}
                productId={product.product_id}
                openModal={openModal}
                openLoginDirect={openLoginDirect}
                goRegister={goRegister}
              />
            )}
          </>
        )}

      </div>
    </ProductLayout>
  );
}
