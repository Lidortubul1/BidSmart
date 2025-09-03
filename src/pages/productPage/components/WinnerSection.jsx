// src/pages/ProductPage/components/WinnerSection.jsx
import React from "react";
import styles from "../ProductPage.module.css";
import OrderDetails from "./OrderDetails";
import { formatCountdown } from "../utils/time";
import { createOrder } from "../../../services/paymentApi";
import useSellerOptions from "../hooks/useSellerOptions";

// תצוגה למשתמש שזכה במוצר - מצבים שונים (שילם / טרם שילם / הזמן פג)
export default function WinnerSection({
  product,
  saleInfo,
  isUnpaidWinner,
  deadlineText,
  secondsLeft,
  onContinueToPayment,
  sellerOption: sellerOptionProp,
  pickupAddressText: pickupAddressTextProp,
  sellerContact: sellerContactProp,
}) {
  const canPay = isUnpaidWinner && (secondsLeft ?? 0) > 0; // האם ניתן עדיין לשלם

  const productId = product?.product_id;
  const { option: sellerOptionHook, pickupAddressText: pickupFromHook, sellerContact: sellerContactHook } =
    useSellerOptions(productId); // שליפת אפשרויות משלוח מהמוכר דרך hook

  const sellerOption = sellerOptionProp ?? sellerOptionHook; // קביעת אופציית משלוח בפועל
  const pickupAddressText = pickupAddressTextProp ?? pickupFromHook; // קביעת טקסט כתובת בפועל
const sellerContact = sellerContactProp ?? sellerContactHook; // ← fallback

  const handlePay = async () => {
    if (onContinueToPayment) return onContinueToPayment(); // אם הועברה פונקציה חיצונית – מפעיל אותה
    const data = await createOrder(product.product_id); // יוצר הזמנה חדשה בשרת
    const approveUrl = data?.links?.find((l) => l.rel === "approve")?.href; // מוצא קישור לאישור תשלום
    if (approveUrl) window.location.href = approveUrl; // מפנה את המשתמש ל-PayPal
    else alert("שגיאה בקבלת קישור לתשלום"); // אם אין קישור – מציג שגיאה
  };

  const renderSellerDeliveryNote = () => {
    if (!sellerOption) return null;
    if (sellerOption === "delivery") {
      return (
        <p className={styles.infoNote}>
          המוכר מאפשר <b>משלוח עד הבית בלבד</b>.
        </p>
      );
    }
    if (sellerOption === "delivery+pickup") {
      return (
        <>
          <p className={styles.infoNote}>
            המוכר מאפשר <b>גם משלוח עד הבית וגם איסוף עצמי</b>.
          </p>
          {pickupAddressText ? (
            <div className={styles.pickupBox} style={{ marginTop: 8 }}>
              {pickupAddressText}
            </div>
          ) : null}
        </>
      );
    }
    return null;
  };

  const renderProductInfo = () => (
    <div style={{ marginTop: 16, textAlign: "right", direction: "rtl" }}>
      {product?.product_name ? <h2>{product.product_name}</h2> : null}
      {product?.description ? (
        <p className={styles.description}>{product.description}</p>
      ) : null}
      {product?.price != null ? (
        <p className={styles.price}>מחיר פתיחה: ₪{product.price}</p>
      ) : null}
      {renderSellerDeliveryNote()}
    </div>
  );

  return (
    <>
      {/* מוצג רק אם המשתמש כבר שילם */}
      {!isUnpaidWinner && <h1>ברכות! זכית במוצר</h1>}

      {/* אם יש saleInfo – מציג פרטי הזמנה */}
      {saleInfo && (
   <OrderDetails
     sale={saleInfo}
     isWinner={true}
     sellerView={false}
     adminView={false}
     sellerContact={sellerContact}
   />
)}

      {/* אם המשתמש זכה אך עדיין לא שילם */}
      {isUnpaidWinner && (
        <>
          {canPay ? (
            <>
              {/* מציג פרטי מוצר */}
              {renderProductInfo()}

              {/* מציג דדליין + טיימר */}
              <p className={styles.notice}>
                ניתן להשלים תשלום עד <b>{deadlineText}</b>
                <br />
                זמן שנותר: {formatCountdown(secondsLeft)}
              </p>

              {/* כפתור מעבר לתשלום */}
              <button
                type="button"
                className={styles.bidButton}
                onClick={handlePay}
              >
                המשך לתשלום
              </button>
            </>
          ) : (
            <>
              {/* חלון הזמן עבר – ביטול זכייה */}
              <p className={styles.error} style={{ marginTop: 12 }}>
                <b> חלפו 24 שעות מהרגע שהיה ניתן לשלם- לכן זכייה זו בוטלה </b>
              </p>

              {/* מציג שוב פרטי מוצר */}
              {renderProductInfo()}
            </>
          )}
        </>
      )}
    </>
  );
}
