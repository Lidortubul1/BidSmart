//src\pages\productPage\components\OwnerUnpaidSection.jsx
// בעל המוצר – “זוכה טרם שילם”: מציג גלריית תמונות ופרטי מוצר, טוען אפשרויות משלוח של המוכר (כולל כתובת איסוף) דרך useSellerOptions, מחשב דד־ליין לתשלום (24ש׳ מאז הצעת הזוכה) דרך usePaymentDeadline ומראה ספירה לאחור; כל עוד ניתן לשלם מציג אזהרה עם הזמן שנותר, ואם פג הזמן מציג הודעת ביטול זכייה והפריט ייחשב “לא נמכר”.

import React from "react";
import pageStyles from "../ProductPage.module.css";
import ProductGallery from "./ProductGallery";
import { formatCountdown } from "../utils/time";
import useSellerOptions from "../hooks/useSellerOptions";
import { usePaymentDeadline } from "../hooks/usePaymentDeadline";
//תצוגה של מוכר על זוכה שטרם שילם
export default function OwnerUnpaidSection({ product }) {
  const productId = product?.product_id;

  // אפשרויות משלוח של המוכר (כמו ב-WinnerSection)
  const { option: sellerOption, pickupAddressText } = useSellerOptions(productId);

  // דד-ליין לתשלום (24 שעות מאז הצעת הזוכה)
  const { secondsLeft, deadlineText } = usePaymentDeadline(
    product?.last_bid_time,
    true,             // אנו מציגים בלוק זה רק כשיש זוכה וסטטוס For Sale
    productId
  );

  const canPay = (secondsLeft ?? 0) > 0;

  const images = product?.images || [];
  const galleryImages = images
    .map((img) => (typeof img === "string" ? img : (img?.image_url || "")))
    .filter(Boolean);

  const renderSellerDeliveryNote = () => {
    if (!sellerOption) return null;
    if (sellerOption === "delivery") {
      return (
        <p className={pageStyles.infoNote}>
          המוכר מאפשר <b>משלוח עד הבית בלבד</b>.
        </p>
      );
    }
    if (sellerOption === "delivery+pickup") {
      return (
        <>
          <p className={pageStyles.infoNote}>
            המוכר מאפשר <b>גם משלוח עד הבית וגם איסוף עצמי</b>.
          </p>
          {pickupAddressText ? (
            <div className={pageStyles.pickupBox} style={{ marginTop: 8 }}>
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
        <p className={pageStyles.description}>{product.description}</p>
      ) : null}
      {product?.price != null ? (
        <p className={pageStyles.price}>מחיר פתיחה: ₪{product.price}</p>
      ) : null}
      {renderSellerDeliveryNote()}
    </div>
  );

  return (
    <div className={pageStyles.page}>
      <div className={pageStyles.content}>
        <div className={pageStyles.imageWrapper}>
          <ProductGallery images={galleryImages} />
        </div>
        <div className={pageStyles.details}>
          {canPay ? (
            <>
              {renderProductInfo()}
              <p className={pageStyles.notice}>
                הרוכש טרם שילם- במידה ולא ישלם עד תאריך ושעה זו: <b>{deadlineText}</b>  הזכייה תבוטל והמוצר יחשב כלא נמכר
                <br />
                זמן שנותר לתשלום: {formatCountdown(secondsLeft)}
              </p>
            </>
          ) : (
            <>
              <p className={pageStyles.error} style={{ marginTop: 12 }}>
                <b>חלפו 24 שעות מהרגע שהיה ניתן לשלם – לכן זכייה זו בוטלה</b>
              </p>
              {renderProductInfo()}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
