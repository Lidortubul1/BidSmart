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
import OrderDetails from "./components/OrderDetails";
import ShippingForm from "../../pages/ShippingForm/ShippingForm";

import { renderStars } from "../../services/productApi";
import { formatCountdown } from "./utils/time";

import { useProductData } from "./hooks/useProductData";
import useSellerOptions from "./hooks/useSellerOptions";
import { useSaleState } from "./hooks/useSaleState";
import { useStartCountdown } from "./hooks/useStartCountdown";
import { usePaymentDeadline } from "./hooks/usePaymentDeadline";

// שולם? לפי טבלת quotation
import { getQuotationsByProductId } from "../../services/quotationApi";

/* ----------------------------------------------------
   ProductPage – גרסה מסודרת לפי תפקיד הצופה
---------------------------------------------------- */
export default function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, setUser } = useAuth();

  /* ---------- דאטה בסיס ---------- */
  const { product, setProduct } = useProductData(id);
  const { loading, option: sellerOption, pickupAddressText, rating: sellerRating } =
    useSellerOptions(id);
  const images = product?.images || [];

  // מכירה/סטטוס זכייה לפי הוק
  const { saleForProduct, saleInfo } = useSaleState(id, user?.id_number);
const [showPickup, setShowPickup] = useState(false); // <— גלובלי לקומפוננטה

  /* ---------- זיהוי תפקיד הצופה ---------- */
  const isAdmin = user?.role === "admin";
  const isOwner =
    user?.role === "seller" &&
    String(user?.id_number) === String(product?.seller_id_number);

  const currentUserId = user?.id_number ?? null;

  // זוכה אמיתי – רק אם יש משתמש מחובר וגם יש מזהה זוכה בפועל
  const winnerIdProduct = product?.winner_id_number;
  const isWinnerByProduct =
    !!currentUserId &&
    winnerIdProduct != null &&
    String(winnerIdProduct).trim() !== "" &&
    String(winnerIdProduct) === String(currentUserId);

  const saleWinnerId =
    saleInfo?.buyer_id_number ?? saleInfo?.winner_id_number ?? null;
  const isWinnerBySale =
    !!currentUserId &&
    saleWinnerId != null &&
    String(saleWinnerId).trim() !== "" &&
    String(saleWinnerId) === String(currentUserId);

  const isWinnerFinal = isWinnerByProduct || isWinnerBySale;
  const isLoggedIn = !!user?.email;
 

  /* ---------- עזרי זמן/סטטוס ---------- */
  const rawStatus = String(product?.product_status ?? "");
  const status = rawStatus.trim().toLowerCase().replace(/[_\s]+/g, " ");

  // “המכרז הסתיים” לפי זמן (גם אם אין sale)
  const endedByTime = useMemo(() => {
    if (!product?.start_date || !product?.end_time) return false;
    const startMs = new Date(product.start_date).getTime();
    const [h = 0, m = 0, s = 0] = String(product.end_time).split(":").map(Number);
    const ms = (h * 3600 + m * 60 + (s || 0)) * 1000;
    return Number.isFinite(startMs) && ms ? Date.now() >= startMs + ms : false;
  }, [product?.start_date, product?.end_time]);

  const isEnded = !!saleForProduct || endedByTime;
  const startCountdownSec = useStartCountdown(product?.start_date);

  // מותר להירשם רק אם: סטטוס פעיל, אין זוכה, ועוד לא הסתיים לפי הזמן
  const noWinner = product?.winner_id_number == null || String(product?.winner_id_number).trim() === "";
  const canRegister = status === "for sale" && noWinner && !isEnded;

  /* ---------- תשלום לזוכה שלא שילם ---------- */
  const [isPaid, setIsPaid] = useState(false);
  const [isUnpaidWinner, setIsUnpaidWinner] = useState(false);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      if (!product?.product_id || !isWinnerFinal) {
        if (alive) setIsPaid(false);
        return;
      }
      try {
        const res = await getQuotationsByProductId(product.product_id);
        const list = res?.data || res || [];
        const winQuote = list.find(
          (q) => String(q.buyer_id_number) === String(product.winner_id_number)
        );
        const paid = !!(
          winQuote &&
          (winQuote.is_paid === true ||
            winQuote.is_paid === 1 ||
            String(winQuote.is_paid).toLowerCase() === "yes" ||
            String(winQuote.is_paid) === "1")
        );
        if (alive) setIsPaid(paid);
      } catch {
        if (alive) setIsPaid(false);
      }
    })();
    return () => { alive = false; };
  }, [product?.product_id, product?.winner_id_number, isWinnerFinal]);

  React.useEffect(() => {
    const pendingWithoutSale = !saleInfo && isWinnerByProduct && status === "for sale";
    const expiredNotPaid = isWinnerByProduct && status === "not sold" && !isPaid;
    const notPaidYet = isWinnerFinal && !isPaid && (saleInfo || pendingWithoutSale || expiredNotPaid);
    setIsUnpaidWinner(Boolean(notPaidYet));
  }, [isWinnerFinal, isWinnerByProduct, status, saleInfo, isPaid]);

  const countdownEnabled = isWinnerFinal && isUnpaidWinner && status === "for sale";
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

  /* ---------- מודאל/התחברות ---------- */
  const [modal, setModal] = useState(null);
  const [showLogin, setShowLogin] = useState(false);

  const openModal = (cfg) =>
    setModal({ ...cfg, onCancel: cfg.onCancel || (() => setModal(null)) });

const askLogin = (/* intent */) => {
  openModal({
    title: "התחברות נדרשת",
    message: "כדי להירשם למוצר יש להתחבר",
    confirmText: "התחברות",
    onConfirm: () => { setModal(null); setShowLogin(true); },
    extraButtonText: "הרשמה",
    onExtra: () => navigate("/register"),
  });
};


  if (!product) return <p>טוען מוצר...</p>;

  /* ====================================================
     1) הגדרת תפקיד הצופה (Role)
     ==================================================== */
  let viewerRole = "guest"; // guest | admin | owner | winner | user
  if (isAdmin) viewerRole = "admin";
  else if (isOwner) viewerRole = "owner";
  else if (isWinnerFinal) viewerRole = "winner";
  else if (isLoggedIn) viewerRole = "user";
  // אחרת נשאר guest

  /* ====================================================
     2) Renderers לפי Role
     ==================================================== */
  const renderOwnerView = () => {
    const ProductEditor = require("./components/productEditor").default;

    // חסימות
    if (status === "admin blocked") {
      return (
        <Box msg={
          <>
            <h3 style={{ marginTop: 0 }}>{product.product_name}</h3>
            <div>ההנהלה חסמה מוצר זה, נא לפנות לתמיכה להמשך בירור.</div>
            <div style={{ marginTop: 8, color: "#555" }}>תיאור: {product.description || "-"}</div>
            <div style={{ marginTop: 4, color: "#555" }}>מחיר פתיחה: ₪{product.price ?? "-"}</div>
            <div style={{ marginTop: 12, fontWeight: 600 }}>לא ניתן לערוך.</div>
          </>
        }/>
      );
    }
    if (status === "blocked") {
      return (
        <Box msg={
          <>
            <h3 style={{ marginTop: 0 }}>{product.product_name}</h3>
            <div>מחקת מוצר זה.</div>
            <div style={{ marginTop: 8, color: "#555" }}>תיאור: {product.description || "-"}</div>
            <div style={{ marginTop: 4, color: "#555" }}>מחיר פתיחה: ₪{product.price ?? "-"}</div>
            <div style={{ marginTop: 12, fontWeight: 600 }}>לא ניתן לערוך.</div>
          </>
        }/>
      );
    }
    // נמכר – מציג פרטי מכירה (ניסוח מוכר)
    if (status === "sale" && saleInfo) {
      return (
        <div className={styles.page}>
          <div className={styles.content}>
            <div className={styles.imageWrapper}><ProductGallery images={images} /></div>
            <div className={styles.details}>
              <h1>{product.product_name}</h1>
              {!isOwner && (startCountdownSec ?? 0) > 0 && (
                <p className={styles.infoNote}>המכרז מתחיל בעוד: {formatCountdown(startCountdownSec)}</p>
              )}
              <p className={styles.notice}>המוצר נמכר — לא ניתן לערוך.</p>
              <OrderDetails sale={saleInfo} isWinner={false} sellerView={true} adminView={false} />
            </div>
          </div>
        </div>
      );
    }
    // עריכת מוצר (לא חסום ולא נמכר)
    return <ProductEditor productId={id} onSaved={() => window.history.back()} onCancel={() => window.history.back()} />;
  };

  const renderAdminView = () => {
    // אדמין – כשהמוצר לא נמכר
    if (status === "not sold") {
      return (
        <div className={styles.page}>
          <div className={styles.content}>
            <div className={styles.imageWrapper}><ProductGallery images={images} /></div>
            <div className={styles.details}>
              <h1>{product.product_name}</h1>
              <p className={styles.notice}>מוצר זה לא נמכר.</p>
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
            </div>
          </div>
          <div className={styles.adminSection}><AdminProductPanel productId={id} /></div>
        </div>
      );
    }
    // אדמין – כשהמוצר נמכר
    if (status === "sale" && saleInfo) {
      return (
        <div className={styles.page}>
          <div className={styles.content}>
            <div className={styles.imageWrapper}><ProductGallery images={images} /></div>
            <div className={styles.details}>
              <h1>{product.product_name}</h1>
              <p className={styles.notice}>המוצר נמכר.</p>
              <OrderDetails sale={saleInfo} isWinner={false} sellerView={false} adminView={true} />
            </div>
          </div>
          <div className={styles.adminSection}><AdminProductPanel productId={id} /></div>
        </div>
      );
    }
    // חסימות (למי שאינו הבעלים)
    if (status === "admin blocked" || status === "blocked") {
      return (
        <Box msg={
          <>
            <h3 style={{ marginTop: 0 }}>{product.product_name}</h3>
            <div>{status === "admin blocked" ? "מוצר זה נמחק ע\"י ההנהלה ואינו זמין יותר" : "המוצר נמחק על ידי המוכר ואינו זמין יותר"}</div>
            <div style={{ marginTop: 8, color: "#555" }}>תיאור: {product.description || "-"}</div>
            <div style={{ marginTop: 4, color: "#555" }}>מחיר פתיחה: ₪{product.price ?? "-"}</div>
          </>
        }/>
      );
    }
    // אדמין – תצוגה רגילה של מוצר (כמו משתמש רגיל)
    return renderUserOrGuestCommon();
  };

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
      <div className={styles.page}>
        <div className={styles.content}>
          <div className={styles.imageWrapper}><ProductGallery images={images} /></div>
          <div className={styles.details}>
            {needsDeliveryAddress ? (
              <ShippingForm />
            ) : (
              <WinnerSection
                product={product}
                saleInfo={saleInfo}
                isUnpaidWinner={isUnpaidWinner}
                secondsLeft={secondsLeft}
                deadlineText={deadlineText}
                sellerOption={sellerOption}
                pickupAddressText={pickupAddressText}
              />
            )}
          </div>
        </div>
        {isAdmin && <div className={styles.adminSection}><AdminProductPanel productId={id} /></div>}
      </div>
    );
  };

  // תצוגה משותפת ל־User (קונה שאינו זוכה) ול־Guest
  const renderUserOrGuestCommon = () => {
    return (
      <div className={styles.page}>
        <div className={styles.content}>
          <div className={styles.imageWrapper}><ProductGallery images={images} /></div>

          <div className={styles.details}>
            {/* הסתיים – לא זכית */}
            {isEnded ? (
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

                {!loading && sellerOption === "delivery" && (
                  <p className={styles.infoNote}>מוצר זה ניתן <b>רק לשליחה</b>.</p>
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

                {/* טיימר "המכירה תחל בעוד..." */}
                {(startCountdownSec ?? 0) > 0 && (
                  <p className={styles.countdown}>המכירה תחל בעוד {formatCountdown(startCountdownSec)}</p>
                )}

                {/* בלוק הרשמה – לכל מי שאינו הבעלים כאשר אפשר להירשם */}
                {String(user?.id_number) !== String(product.seller_id_number) && canRegister && (
                  <RegistrationBlock
                    product={product}
                    user={user}
                    setUser={setUser}
                    navigate={navigate}
                    openModal={openModal}
                    onNeedLogin={() => askLogin("register")}
                  />
                )}

                <SellerRating rating={sellerRating} />
                <ReportIssue user={user} productId={product.product_id} onNeedLogin={() => askLogin("report")} />
              </>
            )}
          </div>
        </div>

        {isAdmin && <div className={styles.adminSection}><AdminProductPanel productId={id} /></div>}

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

        {/* התחברות */}
        {showLogin && (
          <CustomModal
            message={
              <LoginForm
                onSuccess={(u) => {
                  setUser(u);
                  setShowLogin(false);
                  setModal(null);
                  // RegistrationBlock ממשיך לבד אם intent היה "register"
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
  };

  /* ====================================================
     3) ניתוב לפי Role (מוקדם: חסימות כלליות למי שאינו בעלים)
     ==================================================== */
  if (!isOwner && (status === "admin blocked" || status === "blocked")) {
    return (
      <Box
        msg={
          <>
            <h3 style={{ marginTop: 0 }}>{product.product_name}</h3>
            {status === "admin blocked" ? (
              <div>מוצר זה נמחק ע"י ההנהלה ואינו זמין יותר</div>
            ) : (
              <div>המוצר נמחק על ידי המוכר ואינו זמין יותר</div>
            )}
            <div style={{ marginTop: 8, color: "#555" }}>תיאור: {product.description || "-"}</div>
            <div style={{ marginTop: 4, color: "#555" }}>מחיר פתיחה: ₪{product.price ?? "-"}</div>
          </>
        }
      />
    );
  }

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

/* ---------- עזרי UI קטנים ---------- */
function SellerRating({ rating }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, margin: "10px 0", direction: "rtl" }}>
      <strong>דירוג מוכר:</strong>
      {renderStars(rating)}
      <span>({rating})</span>
    </div>
  );
}

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
