// src/pages/productPage/views/WinnerView.jsx
// -----------------------------------------------------------------------------
// WinnerView
// תצוגת דף המוצר עבור הזוכה (buyer) לאחר סיום המכרז.
// מציג אחד משני מצבים עיקריים:
// 1) חסרים פרטי משלוח (והשיטה היא משלוח) → מציג כרטיס מידע + טופס ShippingForm למילוי.
// 2) יש נתונים/או שיטת המסירה היא איסוף → מציג WinnerSection עם פרטי ההזמנה והמצב.
// בנוסף, אם שיטת המסירה היא איסוף עצמי, מאפשר הצגה/הסתרה של כתובת המוכר.
// -----------------------------------------------------------------------------

import { useState } from "react";
import ProductLayout from "../components/ui/ProductLayout";
import ShippingForm from "../../ShippingForm/ShippingForm";
import WinnerSection from "../components/WinnerSection";
import styles from "../ProductPage.module.css";

/**
 * WinnerView
 * תצוגת זוכה: אחראית להחליט האם להציג טופס משלוח (כשצריך) או את סיכום ההזמנה.
 *
 * פרופס עיקריים:
 * - product: אובייקט המוצר (שם/תמונות/וכו').
 * - saleInfo: רשומת המכירה (כתובת/שיטה/מחיר סופי/הערות/טלפונים).
 * - isPaid: האם הזוכה שילם.
 * - isUnpaidWinner, secondsLeft, deadlineText: ניהול ספירה/סטטוס תשלום במקרים רלוונטיים.
 * - sellerOption, pickupAddressText: הגדרות מסירה מצד המוכר + טקסט כתובת איסוף (אם יש).
 * - sellerContact: פרטי קשר של המוכר (לשילוב ב־WinnerSection/OrderDetails).
 */
export default function WinnerView({
  product,
  saleInfo,
  isPaid,
  isUnpaidWinner,
  secondsLeft,
  deadlineText,
  sellerOption,
  pickupAddressText,
  sellerContact,
}) {
  // מצב לוקלי להצגת/הסתרת כתובת איסוף (כאשר שיטת המסירה היא pickup)
  const [showPickup, setShowPickup] = useState(false);

  // האם חסרים פרטי משלוח רלוונטיים (כאשר השיטה היא "delivery" והזוכה כבר שילם)
  const needsDeliveryAddress =
    isPaid &&
    String(saleInfo?.delivery_method || "").toLowerCase() === "delivery" &&
    ["country", "zip", "street", "house_number", "apartment_number"].some((f) => {
      const v = saleInfo?.[f];
      return v == null || String(v).trim() === "";
    });

  return (
    <ProductLayout images={product?.images || []}>
      {/* אם חסרים פרטי משלוח – מציגים תיבת מידע וטופס המשלוח */}
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
        // אחרת – מציגים את סקשן הזוכה עם פרטי ההזמנה והסטטוס
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

      {/* אם השיטה היא איסוף עצמי – מאפשרים לפתוח/לסגור את כתובת המוכר */}
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
}
