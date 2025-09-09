//src\pages\productPage\components\OwnerUnpaidSection.jsx
// בעל המוצר – “זוכה טרם שילם”:
// מציג גלריית תמונות ופרטי מוצר, טוען אפשרויות משלוח של המוכר (כולל כתובת איסוף) דרך useSellerOptions,
// מחשב דד־ליין לתשלום (24ש׳ מאז הצעת הזוכה) דרך usePaymentDeadline ומראה ספירה לאחור;
// כל עוד ניתן לשלם מציג אזהרה עם הזמן שנותר, ואם פג הזמן מציג הודעת ביטול זכייה והפריט ייחשב “לא נמכר”.

import React from "react";
import pageStyles from "../ProductPage.module.css";
import ProductGallery from "./ProductGallery";
import { formatCountdown } from "../utils/time";
import useSellerOptions from "../hooks/useSellerOptions";
import { usePaymentDeadline } from "../hooks/usePaymentDeadline";

/**
 * OwnerUnpaidSection
 * תת־תצוגה עבור בעל המוצר כאשר יש זוכה שטרם השלים תשלום.
 *
 * אחריות:
 *  - הצגת פרטי המוצר (כותרת/תיאור/מחיר) וגלריית תמונות.
 *  - שליפת אפשרות המסירה של המוכר (משלוח בלבד / משלוח+איסוף) דרך useSellerOptions,
 *    והצגת הערת עזר בהתאם (כולל כתובת איסוף אם קיימת).
 *  - חישוב ודיווח זמן אחרון לתשלום (deadline) בהתבסס על last_bid_time דרך usePaymentDeadline.
 *  - כל עוד ניתן לשלם: הצגת הודעת אזהרה עם טקסט דדליין וספירה לאחור.
 *  - אם עבר הזמן: הצגת הודעת ביטול זכייה והגדרת המוצר כ"לא נמכר" (בהצהרה למוכר – הלוגיקה בפועל מתרחשת בשרת/מקום אחר).
 *
 * פרופס:
 *  @param {Object} props
 *  @param {Object} props.product - אובייקט מוצר מלא.
 *    שדות בשימוש: product_id, product_name, description, price, images, last_bid_time
 */
export default function OwnerUnpaidSection({ product }) {
  const productId = product?.product_id;

  // --- שליפת אפשרויות משלוח של המוכר (ומחרוזת כתובת איסוף אם רלוונטי) ---
  //   option: 'delivery' | 'delivery+pickup'
  //   pickupAddressText: מחרוזת כתובת איסוף בפורמט קריא (או undefined אם אין)
  const { option: sellerOption, pickupAddressText } = useSellerOptions(productId);

  // --- חישוב דד־ליין לתשלום (24 שעות מאז הצעת הזוכה) + ספירה לאחור ---
  // secondsLeft: שניות שנותרו לתשלום; deadlineText: טקסט תאריך/שעה קריא
  const { secondsLeft, deadlineText } = usePaymentDeadline(
    product?.last_bid_time,
    true,             // מציגים את הבלוק רק כשיש זוכה ועדיין "ממתין לתשלום"
    productId
  );

  // האם עדיין ניתן לשלם? (כל עוד נותר זמן חיובי)
  const canPay = (secondsLeft ?? 0) > 0;

  // --- הכנת גלריית תמונות מתמונות המוצר ---
  const images = product?.images || [];
  const galleryImages = images
    .map((img) => (typeof img === "string" ? img : (img?.image_url || "")))
    .filter(Boolean);

  /**
   * renderSellerDeliveryNote
   * מציג הודעת עזר על אפשרויות המסירה של המוכר:
   *  - delivery: משלוח בלבד
   *  - delivery+pickup: משלוח וגם איסוף עצמי (+ כתובת איסוף אם קיימת)
   */
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

  /**
   * renderProductInfo
   * בלוק מידע טקסטואלי על המוצר: שם, תיאור, מחיר, והערת מסירה של המוכר.
   */
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

  // --- תצוגה ראשית: גלריה + פרטי מוצר + הודעת התראה/ביטול בהתאם למצב הדדליין ---
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
                {/* ספירה לאחור בפורמט HH:MM:SS */}
                זמן שנותר לתשלום: {formatCountdown(secondsLeft)}
              </p>
            </>
          ) : (
            <>
              {/* כאשר חלף הזמן – מציגים הודעת ביטול זכייה */}
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
