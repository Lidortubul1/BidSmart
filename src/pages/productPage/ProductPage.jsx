// src/pages/productPage/ProductPage.jsx
// ----------------------------------------------------------------------------
// ProductPage
// רכיב-על: שמנהל את דף המוצר כולו. תפקידו:
// 1) להביא נתונים (מוצר, סטטוס מכירה, אפשרויות מוכר).
// 2) לגזור סטטוסים זמניים (האם התחיל/נגמר, האם המשתמש זוכה, סטטוס תשלום וכו').
// 3) לבחור איזו תצוגה (View) לרנדר לפי תפקיד הצופה: Owner / Admin / Winner / User/Guest.
// 4) לנהל מודאלים כלליים (הודעות/התחברות) – ללא תלות ב־View הספציפי.
// שימו לב: הלוגיקה העסקית נשארת כאן, בעוד שהתצוגות עצמן הופרדו לקבצי View ייעודיים.
// ----------------------------------------------------------------------------

import { useMemo, useEffect ,useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { useAuth } from "../../auth/AuthContext";
import CustomModal from "../../components/CustomModal/CustomModal";
import LoginForm from "../../components/LoginForm/LoginForm";

// --- Hooks ייעודיים לאזור הדף ---
import { useProductData } from "./hooks/useProductData";
import useSellerOptions from "./hooks/useSellerOptions";
import { useSaleState } from "./hooks/useSaleState";
import { useStartCountdown } from "./hooks/useStartCountdown";
import { usePaymentDeadline } from "./hooks/usePaymentDeadline";
import { useLoginModal } from "./hooks/useLoginModal";
import { useWinnerPaymentStatus } from "./hooks/useWinnerPaymentStatus";

// --- Views (תצוגה לפי משתמש) ---
import OwnerView from "./views/OwnerView";
import AdminView from "./views/AdminView";
import WinnerView from "./views/WinnerView";
import UserGuestView from "./views/UserGuestView";

/* ----------------------------------------------------
   ProductPage – תצוגת מוצר לפי תפקיד הצופה
---------------------------------------------------- */
export default function ProductPage() {
  // מזהה מוצר וניווט
  const { id } = useParams();
  const navigate = useNavigate();

  // משתמש מחובר (כולל role); setUser לשימוש אחרי התחברות ממודאל
  const { user, setUser } = useAuth();

  /* ---------------------- הבאת נתונים עיקריים ---------------------- */
  // 1) מוצר (כולל setProduct לרענון לאחר פעולות)
  const { product, setProduct } = useProductData(id);

  // 2) אפשרויות מוכר (משלוח/איסוף, דירוג ממוצע, טקסט כתובת איסוף, פרטי קשר מוכר)
  const {
    loading,
    option: sellerOption,
    pickupAddressText,
    rating: sellerRating,
    sellerContact,
  } = useSellerOptions(id);


  // 3) סטטוס מכירה/רשומת sale למוצר (כולל בדיקת זכייה יחסית ל־user)
const { saleForProduct, saleInfo } = useSaleState(id, user?.id_number);
// לוג דיבאג – נשאר יזום
  useEffect(() => {
    console.log("saleInfo →", saleInfo);
  }, [saleInfo]);

  /* ---------------------- קביעת תפקיד הצופה ---------------------- */
  const isAdmin = user?.role === "admin";
  const isOwner =
    user?.role === "seller" && String(user?.id_number) === String(product?.seller_id_number);

  const currentUserId = user?.id_number ?? null;

  // זכייה לפי המוצר (שדה winner_id_number על המוצר)
  const winnerIdProduct = product?.winner_id_number;
  const isWinnerByProduct =
    !!currentUserId &&
    winnerIdProduct != null &&
    String(winnerIdProduct).trim() !== "" &&
    String(winnerIdProduct) === String(currentUserId);

  // זכייה לפי רשומת ה-sale (אם קיימת)
  const saleWinnerId = saleInfo?.buyer_id_number ?? saleInfo?.winner_id_number ?? null;
  const isWinnerBySale =
    !!currentUserId &&
    saleWinnerId != null &&
    String(saleWinnerId).trim() !== "" &&
    String(saleWinnerId) === String(currentUserId);

  const isWinnerFinal = isWinnerByProduct || isWinnerBySale;
  const isLoggedIn = !!user?.email;

  /* ---------------------- נגזרות זמן/סטטוס מכירה ---------------------- */
  const rawStatus = String(product?.product_status ?? "");
  const status = rawStatus.trim().toLowerCase().replace(/[_\s]+/g, " ");

  // האם נגמר לפי start_date + end_time (גם אם אין רשומת sale)
  const endedByTime = useMemo(() => {
    if (!product?.start_date || !product?.end_time) return false;
    const startMs = new Date(product.start_date).getTime();
    const [h = 0, m = 0, s = 0] = String(product.end_time).split(":").map(Number);
    const ms = (h * 3600 + m * 60 + (s || 0)) * 1000;
    return Number.isFinite(startMs) && ms ? Date.now() >= startMs + ms : false;
  }, [product?.start_date, product?.end_time]);

  const isEnded = !!saleForProduct || endedByTime;

  // ספירה לתחילת מכירה (אם טרם החלה)
  const startCountdownSec = useStartCountdown(product?.start_date);
  const hasStarted = !!product?.start_date && (startCountdownSec ?? 0) <= 0;

  // האם המכירה "חיה" (מתקיימת עכשיו)
  const isLive = hasStarted && !isEnded && status === "for sale";

  // הרשמה פתוחה רק אם אין זוכה וסטטוס "for sale" ולא הסתיים
  const noWinner =
    product?.winner_id_number == null || String(product?.winner_id_number).trim() === "";
  const canRegister = status === "for sale" && noWinner && !isEnded;

  /* ---------------------- סטטוס תשלום לזוכה ---------------------- */
  // הוק מרוכז שמחזיר האם הזוכה שילם/לא שילם – מאפשר לייצר נגזרת derivedStatus + ספירה
  const { isPaid, isUnpaidWinner } = useWinnerPaymentStatus({
    product,
    saleInfo,
    isWinnerFinal,
    isWinnerByProduct,
    status,
  });

  // אם הזוכה לא שילם – מציגים סטטוס "awaiting_payment" וספירה לאחור
  const countdownEnabled = isWinnerFinal && isUnpaidWinner;
  const derivedStatus = (isWinnerFinal && isUnpaidWinner) ? "awaiting_payment" : status;

  // ספירה ל"דדליין" של התשלום; בסיום – מרעננים מוצר
  const { secondsLeft, deadlineText } = usePaymentDeadline(
    product?.last_bid_time,
    countdownEnabled,
    product?.product_id,
    async () => {
      if (product?.product_id) {
        const refreshed = await (await import("../../services/productApi"))
          .getProductById(product.product_id);
        setProduct(refreshed);
      }
    }
  );

  /* ---------------------- מודאלים כלליים ---------------------- */
  // ניהול מודאל הודעות/אישורים ומודאל התחברות (LoginForm)
const { modal, setModal, showLogin, setShowLogin, openModal, askLogin } =
    useLoginModal(navigate);

  // דגל ניסיון הרשמה לפני התחברות
  const [attemptedRegister, setAttemptedRegister] = useState(false);

 // מודאל אחרי התחברות: אם התברר שהוא המוכר – מציגים הודעה וסוגרים את הדגל
  useEffect(() => {
    if (!attemptedRegister) return;
    if (!user?.email) return;

    const isOwnerNow =
      user?.id_number &&
      product?.seller_id_number &&
      String(user.id_number) === String(product.seller_id_number);

    if (isOwnerNow) {
     openModal?.({
  title: "פעולה לא אפשרית",
  message: "לא ניתן להירשם למוצר שהעלית.",
  
  cancelText: "סגור",                // אופציונלי – כפתור שני
  onCancel: () => setModal(null),    // מבטיח שיופיע גם אם המודאל דורש זאת
  hideClose: false,
  disableBackdropClose: false,
});
 setAttemptedRegister(false);
    }
  }, [attemptedRegister, user?.email, user?.id_number, product?.seller_id_number, openModal, setModal]);

  // בונוס: איפוס הדגל אם עוברים לעמוד מוצר אחר באמצע
  useEffect(() => { setAttemptedRegister(false); }, [id]);

  // בזמן טעינת מוצר – מציגים סטייט ביניים (שומר UX פשוט)
  if (!product) return <p>טוען מוצר...</p>;

  /* ---------------------- מיפוי Role לתצוגת View ---------------------- */
  let viewerRole = "guest"; // guest | admin | owner | winner | user
  if (isAdmin) viewerRole = "admin";
  else if (isOwner) viewerRole = "owner";
  else if (isWinnerFinal) viewerRole = "winner";
  else if (isLoggedIn) viewerRole = "user";

  // אוסף תמונות (מועבר ל־Views לפי צורך)
  const images = product?.images || [];

  // בחירת ה־View המתאים + הזרמת הפרופס הדרושים לכל View
  let content = null;

  switch (viewerRole) {
    case "owner":
      content = (
        <OwnerView
          id={id}
          product={product}
          status={status}
          saleInfo={saleInfo}
          images={images}
          startCountdownSec={startCountdownSec}
          isOwner={true}
        />
      );
      break;

// בתוך ה-switch:
case "admin":
  content = (
    <AdminView
      id={id}
      product={product}
      status={status}
      saleInfo={saleInfo}
      images={images}
      loading={loading}
      sellerOption={sellerOption}
      sellerRating={sellerRating}
      guestViewProps={{
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
        onAttemptRegister: () => setAttemptedRegister(true),
        shouldAutoRegister: attemptedRegister && isLoggedIn && canRegister,
        clearAttempt: () => setAttemptedRegister(false),
        openLoginDirect: () => setShowLogin(true),
      goRegister: () => navigate("/register"),
      }}
    />
  );
  break;


    case "winner":
      content = (
        <WinnerView
          product={product}
          saleInfo={saleInfo}
          isPaid={isPaid}
          isUnpaidWinner={isUnpaidWinner}
          secondsLeft={secondsLeft}
          deadlineText={deadlineText}
          sellerOption={sellerOption}
          pickupAddressText={pickupAddressText}
          sellerContact={sellerContact}
        />
      );
      break;

    case "user":
    case "guest":
    default:
      content = (
        <UserGuestView
          product={product}
          images={images}
          status={status}
          isEnded={isEnded}
          derivedStatus={derivedStatus}
          loading={loading}
          sellerOption={sellerOption}
          pickupAddressText={pickupAddressText}
          startCountdownSec={startCountdownSec}
          isLive={isLive}
          user={user}
           setUser={setUser} 
          canRegister={canRegister}
          openModal={openModal}
          askLogin={askLogin}
          sellerRating={sellerRating}
          navigate={navigate}
          onAttemptRegister={() => setAttemptedRegister(true)}
          shouldAutoRegister={attemptedRegister && isLoggedIn && canRegister}
          clearAttempt={() => setAttemptedRegister(false)}
           openLoginDirect={() => setShowLogin(true)}
    goRegister={() => navigate("/register")}
        />
      );
  }

  /* ---------------------- מעטפת מודאלים ו־content ---------------------- */
  return (
    <>
      {content}

      {/* מודאל כללי – הודעות/אישורים (מופעל דרך useLoginModal/openModal) */}
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

      {/* מודאל התחברות – מציג את LoginForm; onSuccess מעדכן Context וסוגר מודאלים */}
      {showLogin && (
        <CustomModal
          message={
            <LoginForm
              onSuccess={(u) => {
                setUser(u);
                setShowLogin(false);
                setModal(null);
              }}
            />
          }
          onClose={() => setShowLogin(false)}
          hideClose={false}
          disableBackdropClose={false}
        />
      )}
    </>
  );
}
