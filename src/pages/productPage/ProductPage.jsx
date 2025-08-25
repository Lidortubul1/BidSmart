// src/pages/ProductPage/index.jsx
import React, { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styles from "./ProductPage.module.css";
import { useAuth } from "../../auth/AuthContext";
import CustomModal from "../../components/CustomModal/CustomModal";
import LoginForm from "../../components/LoginForm/LoginForm";
import ProductGallery from "./components/ProductGallery";
import WinnerSection from "./components/WinnerSection";
import RegistrationBlock from "./components/RegistrationBlock";
import ReportIssue from "./components/ReportIssue";
import AdminProductPanel from "./components/AdminProductPanel";

import { renderStars } from "../../services/productApi";

import { useProductData } from "./hooks/useProductData";
import { useSellerOptions } from "./hooks/useSellerOptions";
import { useSaleState } from "./hooks/useSaleState";
import { useStartCountdown } from "./hooks/useStartCountdown";
import { usePaymentDeadline } from "./hooks/usePaymentDeadline";

function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, setUser } = useAuth();

  // מוצר
  const { product, setProduct } = useProductData(id);

  // מוכר (אפשרויות משלוח/איסוף + דירוג)
  const {
    loading,
    option: sellerOption,
    pickupAddressText,
    rating: sellerRating,
  } = useSellerOptions(id);
  const [showPickup, setShowPickup] = useState(false);

  // מצב מכירה/זכייה
  const { saleForProduct, saleInfo, isWinner } = useSaleState(
    id,
    user?.id_number
  );

  // מודאל כללי + התחברות
  const [modal, setModal] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [loginIntent, setLoginIntent] = useState(null); // "register" | "report"

  const openModal = (cfg) =>
    setModal({ ...cfg, onCancel: cfg.onCancel || (() => setModal(null)) });

  // “מכרז הסתיים” לפי זמן (גם אם אין sale)
  const endedByTime = useMemo(() => {
    if (!product?.start_date || !product?.end_time) return false;
    const startMs = new Date(product.start_date).getTime();
    const [h = 0, m = 0, s = 0] = String(product.end_time).split(":").map(Number);
    const ms = (h * 3600 + m * 60 + (s || 0)) * 1000;
    return Number.isFinite(startMs) && ms ? Date.now() >= startMs + ms : false;
  }, [product?.start_date, product?.end_time]);

  const isEnded = !!saleForProduct || endedByTime;

  // דדליין תשלום לזוכה שלא שילם
  const [isUnpaidWinner, setIsUnpaidWinner] = useState(false);
  React.useEffect(() => {
    setIsUnpaidWinner(
      Boolean(
        isWinner &&
          saleInfo &&
          (String(saleInfo.is_paid).toLowerCase() === "no" ||
            String(saleInfo.is_paid) === "0" ||
            saleInfo.is_paid === false)
      )
    );
  }, [isWinner, saleInfo]);

  const { secondsLeft, deadlineText } = usePaymentDeadline(
    product?.last_bid_time,
    isWinner && isUnpaidWinner,
    product?.product_id,
    async () => {
      if (product?.product_id) {
        const refreshed = await (
          await import("../../services/productApi")
        ).getProductById(product.product_id);
        setProduct(refreshed);
      }
    }
  );

  // ספירה עד ההתחלה (לשימוש פנימי לרכיבים אחרים)
  const startCountdownSec = useStartCountdown(product?.start_date);

  // בקשת התחברות לפי הקשר
  const askLogin = (intent) => {
    setLoginIntent(intent);
    openModal({
      title: "התחברות נדרשת",
      message:
        intent === "report"
          ? "כדי לדווח על מוצר יש להתחבר"
          : "כדי להירשם למוצר יש להתחבר",
      confirmText: "התחברות",
      onConfirm: () => {
        setModal(null);
        setShowLogin(true);
      },
      extraButtonText: "הרשמה",
      onExtra: () => navigate("/register"),
    });
  };

  if (!product) return <p>טוען מוצר...</p>;

  // *** הרשאות ***
  const ProductEditor =
    require("../../components/productEditor/productEditor").default;

  const isAdmin = user?.role === "admin";
  const isOwner =
    user?.role === "seller" &&
    String(user?.id_number) === String(product.seller_id_number);

  // בעל המוצר עובר לעורך (מוכר לא יכול להשתתף במכירה של עצמו)
  if (isOwner) {
    return (
      <ProductEditor
        productId={id}
        onSaved={() => window.history.back()}
        onCancel={() => window.history.back()}
      />
    );
  }
  const status = String(product.product_status || "").trim().toLowerCase();

  const images = product?.images || [];
  if (status === "blocked" || status === "admin blocked") {
    return (
      <Box
        msg={
          <>
           
            <div style={{ marginTop: 6 }}>
              מוצר זה נמחק מהמערכת
            </div>
          </>
        }
      />
    );
  }

  return (
    <div className={styles.page}>
      {/* התוכן הראשי (גלריה + פרטים) */}
      <div className={styles.content}>
        {/* גלריה */}
        <div className={styles.imageWrapper}>
          <ProductGallery images={images} />
        </div>

        {/* צד ימין – פרטי מוצר/מצב */}
        <div className={styles.details}>
          {isWinner ? (
            <WinnerSection
              product={product}
              saleInfo={saleInfo}
              isUnpaidWinner={isUnpaidWinner}
              secondsLeft={secondsLeft}
              deadlineText={deadlineText}
            />
          ) : isEnded ? (
            <>
              <h1>{product.product_name}</h1>
              <p className={styles.notice}>המכרז הסתיים — לא זכית במכרז זה.</p>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  margin: "10px 0",
                  direction: "rtl",
                }}
              >
                <strong>דירוג מוכר:</strong>
                {renderStars(sellerRating)}
                <span>({sellerRating})</span>
              </div>
            </>
          ) : (
            <>
              <h1>{product.product_name}</h1>
              <p className={styles.description}>{product.description}</p>
              <p className={styles.price}>מחיר פתיחה: ₪{product.price}</p>

              {/* מידע משלוח מהמוכר */}
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
                      className={`${styles.linkLikeButton} ${
                        showPickup ? styles.linkLikeButtonActive : ""
                      }`}
                      onClick={() => setShowPickup((v) => !v)}
                    >
                      הצג/הסתר כתובת המוכר
                    </button>
                    {showPickup && (
                      <div className={styles.pickupBox}>
                        {pickupAddressText || (
                          <small>(כתובת המוכר לא זמינה כרגע)</small>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {product?.is_live === "1" && product?.winner_id_number === null && (
                <p className={styles.notice}>המכירה פעילה</p>
              )}

              {/* הרשמה / ביטול / מעבר ללייב – רק מי שאינו אדמין ואינו בעל המוצר */}
              {!isAdmin &&
                String(user?.id_number) !== String(product.seller_id_number) && (
                  <RegistrationBlock
                    product={product}
                    user={user}
                    setUser={setUser}
                    navigate={navigate}
                    openModal={openModal}
                    onNeedLogin={() => askLogin("register")}
                  />
                )}

              {/* דירוג מוכר */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  margin: "10px 0",
                  direction: "rtl",
                }}
              >
                <strong>דירוג מוכר:</strong>
                {renderStars(sellerRating)}
                <span>({sellerRating})</span>
              </div>

              {/* דיווח על מוצר */}
              <ReportIssue
                user={user}
                productId={product.product_id}
                onNeedLogin={() => askLogin("report")}
              />
            </>
          )}
        </div>
      </div>

      {/* פאנל מנהל – עכשיו מתחת למוצר */}
      {isAdmin && (
        <div className={styles.adminSection}>
          <AdminProductPanel productId={id} />
        </div>
      )}

      {/* מודאל כללי */}
      {modal && (
        <CustomModal
          title={modal.title}
          message={modal.message}
          confirmText={modal.confirmText}
          cancelText={modal.cancelText}
          onConfirm={modal.onConfirm}
          onCancel={modal.onCancel}
          extraButtonText={modal.extraButtonText}
          onExtra={modal.onExtra}
          onClose={() => setModal(null)}
        />
      )}

      {/* פופ־אפ התחברות */}
      {showLogin && (
        <CustomModal
          message={
            <LoginForm
              onSuccess={(u) => {
                setUser(u);
                setShowLogin(false);
                setModal(null);
                if (loginIntent === "register") {
                  // לאחר לוגין—RegistrationBlock ימשיך בתהליך
                }
              }}
            />
          }
          onClose={() => setShowLogin(false)}
          hideClose={false}
          disableBackdropClose={false}
        />
      )}
    </div>
  );
}

export default ProductPage;
function Box({ msg }) {
  return (
    <div
      style={{
        padding: 16,
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        background: "#fff",
        maxWidth: 640,
        margin: "16px auto",
        textAlign: "center",
      }}
    >
      {msg}
    </div>
  );
}
