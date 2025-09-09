// src/pages/productPage/ProductPage.jsx
// ProductPage: דף מוצר דינמי לפי תפקיד (אדמין/מוכר/זוכה/משתמש/אורח); כולל הבאת נתונים, חישוב סטטוס וזמנים, טפסי עריכה/משלוח, הרשמה למכירה, פרטי הזמנה, דירוג ודיווח, עם מודאלים לניהול הודעות והתחברות.

import React, { useMemo, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styles from "./ProductPage.module.css";

import { useAuth } from "../../auth/AuthContext";
import CustomModal from "../../components/CustomModal/CustomModal";
import LoginForm from "../../components/LoginForm/LoginForm";

import WinnerSection from "./components/WinnerSection";
import RegistrationBlock from "./components/RegistrationBlock";
import ReportIssue from "./components/ReportIssue";
import AdminProductPanel from "./components/AdminProductPanel";
import OrderDetails from "./components/OrderDetails";
import ShippingForm from "../../pages/ShippingForm/ShippingForm";

import { formatCountdown } from "./utils/time";

import { useProductData } from "./hooks/useProductData";
import useSellerOptions from "./hooks/useSellerOptions";
import { useSaleState } from "./hooks/useSaleState";
import { useStartCountdown } from "./hooks/useStartCountdown";
import { usePaymentDeadline } from "./hooks/usePaymentDeadline";

import ProductLayout from "./components/ui/ProductLayout";
import SellerRating from "./components/ui/SellerRating"
import Box from "./components/ui/Box";
import { useLoginModal } from "./hooks/useLoginModal";
import { useWinnerPaymentStatus } from "./hooks/useWinnerPaymentStatus";

/* ----------------------------------------------------
   ProductPage – תצוגת מוצר לפי תפקיד הצופה (אדמין/מוכר/זוכה/משתמש/אורח)
---------------------------------------------------- */
export default function ProductPage() {
  const { id } = useParams();                         // מזהה מוצר מה-URL
  const navigate = useNavigate();                     // נווט לקישורים פנימיים
  const { user, setUser } = useAuth();                // משתמש מחובר (כולל role)

  /* ---------- טעינת נתוני מוצר ואפשרויות מוכר ---------- */
  const { product, setProduct } = useProductData(id); // הבאת מוצר ועדכון לאחר רענון
  const {
    loading,
    option: sellerOption,
    pickupAddressText,
    rating: sellerRating,
    sellerContact,                   // ← הוסף
  } = useSellerOptions(id);                      // משלוח/איסוף + דירוג מוכר

  /* ---------- סטטוס מכירה/זכייה ---------- */
  const { saleForProduct, saleInfo } = useSaleState(id, user?.id_number); // מצב מכירה ושורת מכירה אם קיימת
  const [showPickup, setShowPickup] = useState(false);                    // הצגת/הסתרת כתובת איסוף
  // הוסף ממש אחרי זה:
  useEffect(() => {
    console.log("saleInfo →", saleInfo);
  }, [saleInfo]);
  /* ---------- זיהוי תפקיד הצופה ---------- */
  const isAdmin = user?.role === "admin";                                      // האם אדמין
  const isOwner =
    user?.role === "seller" && String(user?.id_number) === String(product?.seller_id_number); // האם המוכר של המוצר

  const currentUserId = user?.id_number ?? null;                               // מזהה משתמש מחובר

  // בדיקת זכייה לפי שדה winner_id_number על המוצר
  const winnerIdProduct = product?.winner_id_number;
  const isWinnerByProduct =
    !!currentUserId &&
    winnerIdProduct != null &&
    String(winnerIdProduct).trim() !== "" &&
    String(winnerIdProduct) === String(currentUserId);







  // בדיקת זכייה לפי שורת המכירה (saleInfo) אם קיימת
  const saleWinnerId = saleInfo?.buyer_id_number ?? saleInfo?.winner_id_number ?? null;
  const isWinnerBySale =
    !!currentUserId &&
    saleWinnerId != null &&
    String(saleWinnerId).trim() !== "" &&
    String(saleWinnerId) === String(currentUserId);

  const isWinnerFinal = isWinnerByProduct || isWinnerBySale;                   // זוכה סופי (מוצר או מכירה)
  const isLoggedIn = !!user?.email;                                            // יש התחברות

  /* ---------- עזרי זמן/סטטוס ---------- */
  const rawStatus = String(product?.product_status ?? "");                     // סטטוס גולמי מהדאטה
  const status = rawStatus.trim().toLowerCase().replace(/[_\s]+/g, " ");       // נירמול הסטטוס

  // האם הסתיים לפי start_date + end_time (גם ללא sale)
  const endedByTime = useMemo(() => {
    if (!product?.start_date || !product?.end_time) return false;
    const startMs = new Date(product.start_date).getTime();
    const [h = 0, m = 0, s = 0] = String(product.end_time).split(":").map(Number);
    const ms = (h * 3600 + m * 60 + (s || 0)) * 1000;
    return Number.isFinite(startMs) && ms ? Date.now() >= startMs + ms : false;
  }, [product?.start_date, product?.end_time]);

  const isEnded = !!saleForProduct || endedByTime;                      // הסתיימה המכירה (לפי זמן או לפי מכירה בפועל)
  const startCountdownSec = useStartCountdown(product?.start_date);     // שניות עד תחילת מכירה (אם טרם החלה)
  // האם התחילה (הטיימר הגיע ל-0 או מתחת) ויש start_date
  const hasStarted = !!product?.start_date && (startCountdownSec ?? 0) <= 0;

  // “מכירה מתקיימת”: התחילה, טרם הסתיימה, ובסטטוס שמאפשר מכירה
  const isLive =
    hasStarted &&
    !isEnded &&
    status === "for sale";

  // הרשמה אפשרית רק אם: סטטוס פעיל, אין זוכה, ולא הסתיים
  const noWinner = product?.winner_id_number == null || String(product?.winner_id_number).trim() === "";
  const canRegister = status === "for sale" && noWinner && !isEnded;

  /* ---------- סטטוס תשלום לזוכה (Hook מרוכז) ---------- */
  const { isPaid, isUnpaidWinner } =
    useWinnerPaymentStatus({
      product,
      saleInfo,
      isWinnerFinal,
      isWinnerByProduct,
      status,
    });


  // האם להציג שעון ספירה לתשלום לזוכה שלא שילם
  const countdownEnabled = isWinnerFinal && isUnpaidWinner;
  // סטטוס נגזר להצגה בלבד – לא משנה בסיס נתונים ולא נשלח לשרת
  const derivedStatus =
    (isWinnerFinal && isUnpaidWinner) ? "awaiting_payment" : status;

  // ספירה לאחור לזמן תשלום; על סיום תוקף – רענון מוצר
  const { secondsLeft, deadlineText } = usePaymentDeadline(
    product?.last_bid_time,
    countdownEnabled,
    product?.product_id,
    async () => {
      if (product?.product_id) {
        const refreshed = await (await import("../../services/productApi")).getProductById(product.product_id);
        setProduct(refreshed);
      }
    }
  );

  /* ---------- מודאל/התחברות (Hook מרוכז) ---------- */
  const { modal, setModal, showLogin, setShowLogin, openModal, askLogin } = useLoginModal(navigate);

  // בזמן טעינת מוצר
  if (!product) return <p>טוען מוצר...</p>;

  /* ====================================================
     1) קביעת תפקיד הצופה (Role)
     ==================================================== */
  let viewerRole = "guest";                     // guest | admin | owner | winner | user
  if (isAdmin) viewerRole = "admin";
  else if (isOwner) viewerRole = "owner";
  else if (isWinnerFinal) viewerRole = "winner";
  else if (isLoggedIn) viewerRole = "user";

  /* ====================================================
     2) פונקציות רנדר לפי Role
     ==================================================== */
  const images = product?.images || [];         // תמונות המוצר להצגה בגלריה

  // תצוגת בעלים (מוכר שהוא בעל המוצר)
  const renderOwnerView = () => {
    const ProductEditor = require("./components/productEditor").default; // טעינה דינמית קלה (נמנע Bundle מיותר)

    // מוצר חסום ע"י הנהלה – אין עריכה, הצגת פרטים בסיסיים
    if (status === "admin blocked") {
      return (
        <Box>
          <h3 style={{ marginTop: 0 }}>{product.product_name}</h3>
          <div>ההנהלה חסמה מוצר זה, נא לפנות לתמיכה להמשך בירור.</div>
          <div style={{ marginTop: 8, color: "#555" }}>תיאור: {product.description || "-"}</div>
          <div style={{ marginTop: 4, color: "#555" }}>מחיר פתיחה: ₪{product.price ?? "-"}</div>
          <div style={{ marginTop: 12, fontWeight: 600 }}>לא ניתן לערוך.</div>
        </Box>
      );
    }

    // מוצר שנמחק ע"י המוכר – אין עריכה
    if (status === "blocked") {
      return (
        <Box>
          <h3 style={{ marginTop: 0 }}>{product.product_name}</h3>
          <div>מחקת מוצר זה.</div>
          <div style={{ marginTop: 8, color: "#555" }}>תיאור: {product.description || "-"}</div>
          <div style={{ marginTop: 4, color: "#555" }}>מחיר פתיחה: ₪{product.price ?? "-"}</div>
          <div style={{ marginTop: 12, fontWeight: 600 }}>לא ניתן לערוך.</div>
        </Box>
      );
    }

    // מוצר שנמכר – מציגים פרטי מכירה (צד מוכר), בלי אפשרות עריכה
    // בתוך renderOwnerView
    if (status === "sale" && saleInfo) {
      return (
        <ProductLayout images={images}>
          {/* התראה למוכר: הקונה שילם אך טרם מילא כתובת */}



          <h1>{product.product_name}</h1>
          {!isOwner && (startCountdownSec ?? 0) > 0 && (
            <p className={styles.infoNote}>
              המכרז מתחיל בעוד: {formatCountdown(startCountdownSec)}
            </p>
          )}
          <p className={styles.notice}>המוצר נמכר — לא ניתן לערוך.</p>
          <OrderDetails
            sale={saleInfo}
            isWinner={false}
            sellerView={true}
            adminView={false}
          />
        </ProductLayout>
      );
    }


    // עריכת מוצר (לא חסום ולא נמכר)
    return <ProductEditor productId={id} onSaved={() => window.history.back()} onCancel={() => window.history.back()} />;
  };


  // תצוגת אדמין
  const renderAdminView = () => {
    // מוצר שלא נמכר – מציגים פירוט, אופציות משלוח/איסוף ודירוג מוכר
    // מוצר שלא נמכר – מציגים פירוט, אופציות משלוח/איסוף ודירוג מוכר
    if (status === "not sold") {
      const hasWinner = product?.winner_id_number != null && String(product.winner_id_number).trim() !== "";

      return (
        <ProductLayout
          images={images}
          adminPanel={<div className={styles.adminSection}><AdminProductPanel productId={id} /></div>}
        >
          <h1>{product.product_name}</h1>

          {hasWinner ? (
            <p
              className={styles.notice}
              style={{ background: "#fff3cd", border: "1px solid #ffeeba", color: "#856404" }}
            >
              הרוכש לא שילם על מוצר זה
            </p>
          ) : (
            <p className={styles.notice}>מוצר זה לא נמכר.</p>
          )}

          <p className={styles.description}>{product.description}</p>
          <p className={styles.price}>מחיר פתיחה: ₪{product.price}</p>

          {!loading && sellerOption === "delivery" && (
            <p className={styles.infoNote}>מוצר זה ניתן <b>רק לשליחה</b>.</p>
          )}

          {!loading && sellerOption === "delivery+pickup" && (
            <div className={styles.infoNote}>
              מוצר זה ניתן <b>גם לשליחה וגם לאיסוף עצמי</b> מכתובת המוכר.
            </div>
          )}

          <SellerRating rating={sellerRating} />
        </ProductLayout>
      );
    }



    // מוצר שנמכר – מציגים פרטי מכירה (צד אדמין)
    if (status === "sale" && saleInfo) {
      return (
        <ProductLayout
          images={images}
          adminPanel={<div className={styles.adminSection}><AdminProductPanel productId={id} /></div>}
        >
          <h1>{product.product_name}</h1>
          <p className={styles.notice}>המוצר נמכר.</p>
          <OrderDetails sale={saleInfo} isWinner={false} sellerView={false} adminView={true} />
        </ProductLayout>
      );
    }

    // מוצר חסום/נמחק – הודעה בלבד
    if (status === "admin blocked" || status === "blocked") {
      return (
        <Box>
          <h3 style={{ marginTop: 0 }}>{product.product_name}</h3>
          <div>{status === "admin blocked" ? 'מוצר זה נמחק ע"י ההנהלה ואינו זמין יותר' : "המוצר נמחק על ידי המוכר ואינו זמין יותר"}</div>
          <div style={{ marginTop: 8, color: "#555" }}>תיאור: {product.description || "-"}</div>
          <div style={{ marginTop: 4, color: "#555" }}>מחיר פתיחה: ₪{product.price ?? "-"}</div>
        </Box>
      );
    }

    // תצוגה רגילה (כמו משתמש רגיל/אורח)
    return renderUserOrGuestCommon();
  };

  // תצוגת זוכה (כולל טיפול בהשלמת פרטי משלוח במקרה הצורך)
  const renderWinnerView = () => {
    const needsDeliveryAddress =
      isWinnerFinal &&
      isPaid &&
      String(saleInfo?.delivery_method || "").toLowerCase() === "delivery" &&
      ["country", "zip", "street", "house_number", "apartment_number"].some((f) => {
        const v = saleInfo?.[f];
        return v == null || String(v).trim() === "";
      });
    return (
      <ProductLayout
        images={images}
        adminPanel={isAdmin ? <div className={styles.adminSection}><AdminProductPanel productId={id} /></div> : undefined}
      >
        {/* ShippingForm- טופס משלוח אם חסרים פרטי כתובת לזוכה ששילם */}
        {needsDeliveryAddress ? (
          <div>
            <div className={styles.orderCard} style={{ marginBottom: 16 }}>
              <div style={{ textAlign: "right" }}>
                <h3 style={{ margin: 0 }}>{product.product_name}</h3>
                {saleInfo?.final_price && (
                  <div style={{ marginTop: 4, color: "#444" }}>
                    מחיר ששולם: {saleInfo.final_price} ₪
                  </div>

                )}
                <div style={{ marginTop: 4, color: "#666" }}>
                  שילמת על מוצר זה- נא מלא/י את פרטי המשלוח להמשך טיפול.
                </div>
              </div>
            </div>
            <ShippingForm />
          </div>
        ) : (
          <WinnerSection
            product={product}
            saleInfo={saleInfo}
            isUnpaidWinner={isUnpaidWinner}
            secondsLeft={secondsLeft}
            deadlineText={deadlineText}
            sellerOption={sellerOption}
            pickupAddressText={pickupAddressText}
            sellerContact={sellerContact}
          />
        )}
        {/* הצגת כתובת המוכר גם לזוכה שבחר איסוף עצמי */}
        {String(saleInfo?.delivery_method || "").toLowerCase() === "pickup" && (
          <div className={styles.infoNote} style={{ marginTop: 12 }}>
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
        )}

      </ProductLayout>
    );
  };

  // תצוגה משותפת למשתמש רגיל/אורח (לא זוכה)
  const renderUserOrGuestCommon = () => {
    return (
      <ProductLayout
        images={images}
        adminPanel={isAdmin ? <div className={styles.adminSection}><AdminProductPanel productId={id} /></div> : undefined}
      >
        {isEnded && derivedStatus !== "awaiting_payment" ? (
          <>
            <h1>{product.product_name}</h1>
            <p className={styles.notice}>המכרז הסתיים — לא זכית במכרז זה.</p>
            <SellerRating rating={sellerRating} />
          </>
        ) : (
          <>
            <h1>{product.product_name}</h1>
            <p className={styles.description}>{product.description}</p>
            <p className={styles.price}>מחיר פתיחה: ₪{product.price}</p>

            {/* הודעות לגבי אופן מסירה */}
            {!loading && sellerOption === "delivery" && <p className={styles.infoNote}>מוצר זה ניתן <b>רק לשליחה</b>.</p>}

            {!loading && sellerOption === "delivery+pickup" && (
              <div className={styles.infoNote}>
                מוצר זה ניתן <b>גם לשליחה וגם לאיסוף עצמי</b> מכתובת המוכר.
                <div style={{ marginTop: 8 }}>
                  <button
                    type="button"
                    className={`${styles.linkLikeButton} ${showPickup ? styles.linkLikeButtonActive : ""}`}
                    onClick={() => setShowPickup((v) => !v)} // הצגת/הסתרת כתובת איסוף
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

            {/* טיימר לתחילת מכירה */}
            {(startCountdownSec ?? 0) > 0 && (
              <p className={styles.countdown}>
                המכירה תחל בעוד {formatCountdown(startCountdownSec)}
              </p>
            )}

            {isLive && (
              <p
                className={styles.countdown}

              >
                המכירה מתקיימת ברגעים אלו
              </p>
            )}

            {/* בלוק הרשמה – רק אם הצופה אינו המוכר ובאפשרות להירשם */}
            {String(user?.id_number) !== String(product.seller_id_number) && canRegister && (
              <RegistrationBlock
                product={product}
                user={user}
                setUser={setUser}
                navigate={navigate}
                openModal={openModal}
                onNeedLogin={() => askLogin()} // פתיחת מודאל התחברות במידת הצורך
              />
            )}

            <SellerRating rating={sellerRating} />
            <ReportIssue user={user} productId={product.product_id} onNeedLogin={() => askLogin()} />
          </>
        )}

        {/* מודאל כללי – הודעות/אישורים */}
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

        {/* מודאל התחברות עם טופס */}
        {showLogin && (
          <CustomModal
            message={
              <LoginForm
                onSuccess={(u) => {
                  setUser(u);            // שמירת המשתמש המחובר
                  setShowLogin(false);   // סגירת מודאל ההתחברות
                  setModal(null);        // ניקוי מודאל כללי אם היה
                }}
              />
            }
            onClose={() => setShowLogin(false)}
            hideClose={false}
            disableBackdropClose={false}
          />
        )}
      </ProductLayout>
    );
  };

  /* ====================================================
     3) חסימות גלובליות – לצופים שאינם בעלים
     ==================================================== */
  if (!isOwner && (status === "admin blocked" || status === "blocked")) {
    return (
      <Box>
        <h3 style={{ marginTop: 0 }}>{product.product_name}</h3>
        {status === "admin blocked" ? (
          <div>מוצר זה נמחק ע"י ההנהלה ואינו זמין יותר</div>
        ) : (
          <div>המוצר נמחק על ידי המוכר ואינו זמין יותר</div>
        )}
        <div style={{ marginTop: 8, color: "#555" }}>תיאור: {product.description || "-"}</div>
        <div style={{ marginTop: 4, color: "#555" }}>מחיר פתיחה: ₪{product.price ?? "-"}</div>
      </Box>
    );
  }

  /* ====================================================
     4) ניתוב הרנדר לפי Role
     ==================================================== */
  switch (viewerRole) {
    case "owner":
      return renderOwnerView();
    case "admin":
      return renderAdminView();
    case "winner":
      return renderWinnerView();
    case "user":
    case "guest":
    default:
      return renderUserOrGuestCommon();
  }
}
