// src/pages/ProductPage/components/WinnerSection.jsx
import React from "react";
import styles from "../ProductPage.module.css";
import OrderDetails from "./OrderDetails"
import { formatCountdown } from "../utils/time"
import { createOrder } from "../../../services/paymentApi"

export default function WinnerSection({
  product, saleInfo, isUnpaidWinner, deadlineText, secondsLeft, onContinueToPayment
}) {
  const canPay = isUnpaidWinner && (secondsLeft ?? 0) > 0;

  const handlePay = async () => {
    if (onContinueToPayment) return onContinueToPayment();
    const data = await createOrder(product.product_id);
    const approveUrl = data?.links?.find((l) => l.rel === "approve")?.href;
    if (approveUrl) window.location.href = approveUrl;
    else alert("שגיאה בקבלת קישור לתשלום");
  };

  return (
    <>
      {!isUnpaidWinner && <h1>ברכות! זכית במוצר</h1>}
      {saleInfo && <OrderDetails sale={saleInfo} />}

      {isUnpaidWinner && (
        <>
          {canPay ? (
            <>
              <p className={styles.notice}>
                ניתן להשלים תשלום עד <b>{deadlineText}</b><br />
                זמן שנותר: {formatCountdown(secondsLeft)}
              </p>
              <button type="button" className={styles.bidButton} onClick={handlePay}>
                המשך לתשלום
              </button>
            </>
          ) : (
            <p className={styles.error}>חלפו 24 שעות מאז הזכייה ולא בוצע תשלום. ההזמנה בוטלה.</p>
          )}
        </>
      )}
    </>
  );
}
