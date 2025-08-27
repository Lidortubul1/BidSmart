// src/pages/ProductPage/components/WinnerSection.jsx
import React from "react";
import styles from "../ProductPage.module.css";
import OrderDetails from "./OrderDetails";
import { formatCountdown } from "../utils/time";
import { createOrder } from "../../../services/paymentApi";
import useSellerOptions from "../hooks/useSellerOptions";

export default function WinnerSection({
  product,
  saleInfo,
  isUnpaidWinner,
  deadlineText,
  secondsLeft,
  onContinueToPayment,
  sellerOption: sellerOptionProp,
  pickupAddressText: pickupAddressTextProp,
}) {
  const canPay = isUnpaidWinner && (secondsLeft ?? 0) > 0;

  const productId = product?.product_id;
  const { option: sellerOptionHook, pickupAddressText: pickupFromHook } =
    useSellerOptions(productId);

  const sellerOption = sellerOptionProp ?? sellerOptionHook; // "delivery" | "delivery+pickup"
  const pickupAddressText = pickupAddressTextProp ?? pickupFromHook;

  const handlePay = async () => {
    if (onContinueToPayment) return onContinueToPayment();
    const data = await createOrder(product.product_id);
    const approveUrl = data?.links?.find((l) => l.rel === "approve")?.href;
    if (approveUrl) window.location.href = approveUrl;
    else alert("שגיאה בקבלת קישור לתשלום");
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
      {!isUnpaidWinner && <h1>ברכות! זכית במוצר</h1>}
      {saleInfo && <OrderDetails sale={saleInfo} />}

      {isUnpaidWinner && (
        <>
          {canPay ? (
            <>
              {renderProductInfo()}

              <p className={styles.notice}>
                ניתן להשלים תשלום עד <b>{deadlineText}</b>
                <br />
                זמן שנותר: {formatCountdown(secondsLeft)}
              </p>

              <button type="button" className={styles.bidButton} onClick={handlePay}>
                המשך לתשלום
              </button>
            </>
          ) : (
            <>   
            <p className={styles.error} style={{ marginTop: 12 }}>
            <b> חלפו 24 שעות מהרגע שהיה ניתן לשלם- לכן זכייה זו בוטלה   </b>   
              </p>
              {renderProductInfo()}

           
            </>
          )}
        </>
      )}
    </>
  );
}
