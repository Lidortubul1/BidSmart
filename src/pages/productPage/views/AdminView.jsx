// src/pages/productPage/views/AdminView.jsx
import React from "react";
import ProductLayout from "../components/ui/ProductLayout";
import AdminProductPanel from "../components/AdminProductPanel";

import SellerRating from "../components/ui/SellerRating";
import OrderDetails from "../components/OrderDetails";
import UserGuestView from "./UserGuestView";
import styles from "../ProductPage.module.css";
// למעלה יחד עם הייבוא הקיימים
import { usePaymentDeadline } from "../hooks/usePaymentDeadline";
import { formatCountdown } from "../utils/time";

/**
 * AdminView
 * תצוגת דף המוצר כאשר הצופה הוא אדמין.
 *
 * עקרונות התצוגה:
 * 1) מוצר שלא נמכר: מציגים פרטי מוצר, הודעת מצב, פאנל ניהול אדמין וסגנון משלוח/איסוף של המוכר.
 * 2) מוצר שנמכר: מציגים ProductLayout + OrderDetails במצב adminView.
 * 3) מוצר חסום/נמחק: הודעת מידע בלבד (לצופים שאינם בעלים).
 *
 * שימו לב:
 * - פאנל האדמין (AdminProductPanel) מוצמד לצד כ־adminPanel בתוך ProductLayout.
 * - אין שינויי מצב נתונים כאן; זהו רכיב תצוגה “טהור” שמקבל נתונים מהורה.
 */
export default function AdminView({
  id,
  product,
  status,
  saleInfo,
  images,
  loading,
  sellerOption,
  sellerRating,
  guestViewProps = {},
}) {
  const hasWinner =
    (product?.winner_id_number && String(product.winner_id_number).trim() !== "") ||
    !!(saleInfo?.buyer_id_number || saleInfo?.winner_id_number);
const awaiting = status === "for sale" && hasWinner;
const { secondsLeft, deadlineText } = usePaymentDeadline(
  product?.last_bid_time,
  awaiting,
  product?.product_id
);

  // 0) for sale בלי זוכה – מציגים כמו קונה + פאנל ניהול למטה
  if (status === "for sale" && !hasWinner) {
    return (
      <UserGuestView
        product={product}
        images={images}
        status={status}
        {...guestViewProps}
        adminPanel={
          <div className={styles.adminSection}>
            <AdminProductPanel productId={id} />
          </div>
        }
      />
    );
  }
// 0.5) for sale עם זוכה – הרוכש טרם שילם + טיימר
if (status === "for sale" && hasWinner) {
  return (
    <ProductLayout
      images={images}
      adminPanel={<AdminProductPanel productId={id} />}
    >
      <h1>{product.product_name}</h1>

      {secondsLeft > 0 ? (
        <>
          <p
            className={styles.notice}
              style={{ background: "#fffcf2ff", border: "1px solid #e0d9c0ff", color: "#856404" }}
          >
            הרוכש טרם שילם. ניתן לשלם עד <b>{deadlineText}</b>.
            <br />
            זמן שנותר לתשלום: {formatCountdown(secondsLeft)}
          </p>
        </>
      ) : (
        <p className={styles.error} style={{ marginTop: 12 }}>
          חלפו 24 שעות מאז הזכייה — הזכייה תבוטל והפריט ייחשב "לא נמכר".
        </p>
      )}

      <p className={styles.description}>{product.description}</p>
      <p className={styles.price}>מחיר פתיחה: ₪{product.price}</p>
    </ProductLayout>
  );
}

  // 1) not sold – כרטיס מוצר + פאנל ניהול
  if (status === "not sold") {
    const hasWinnerOnNotSold =
      product?.winner_id_number != null &&
      String(product.winner_id_number).trim() !== "";

    return (
      <ProductLayout
        images={images}
        adminPanel={<AdminProductPanel productId={id} />}
      >
        <h1>{product.product_name}</h1>

     {hasWinnerOnNotSold ? (
   <p
     className={styles.notice}
     style={{ background: "#fffcf2ff", border: "1px solid #e0d9c0ff", color: "#856404" }}
   >
     הרוכש לא שילם על המוצר
   </p>
 ) : (
   <p className={styles.notice}>מוצר זה לא נמכר.</p>
 )}

        <p className={styles.description}>{product.description}</p>
        <p className={styles.price}>מחיר פתיחה: ₪{product.price}</p>

        {!loading && sellerOption === "delivery" && (
          <p className={styles.infoNote}>
            מוצר זה ניתן <b>רק לשליחה</b>.
          </p>
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

  // 2) sale – פרטי הזמנה + פאנל ניהול
  if (status === "sale" && saleInfo) {
    return (
      <ProductLayout
        images={images}
        adminPanel={<AdminProductPanel productId={id} />}
      >
        <h1>{product.product_name}</h1>
        <p className={styles.notice}>המוצר נמכר.</p>
        <OrderDetails
          sale={saleInfo}
          isWinner={false}
          sellerView={false}
          adminView={true}
        />
      </ProductLayout>
    );
  }

  // 3) admin blocked – כמו OwnerView מבחינת נראות + פאנל ניהול
  if (status === "admin blocked") {
    return (
      <ProductLayout
        images={images}
        adminPanel={<AdminProductPanel productId={id} />}
      >
        <h1>{product.product_name}</h1>
        <p className={styles.notice}>ההנהלה חסמה מוצר זה, נא לפנות לתמיכה להמשך בירור.</p>
        <p className={styles.description}>תיאור: {product.description || "-"}</p>
        <p className={styles.price}>מחיר פתיחה: ₪{product.price ?? "-"}</p>
      </ProductLayout>
    );
  }

  // 4) blocked – כמו OwnerView מבחינת נראות + פאנל ניהול
  if (status === "blocked") {
    return (
      <ProductLayout
        images={images}
        adminPanel={<AdminProductPanel productId={id} />}
      >
        <h1>{product.product_name}</h1>
        <p className={styles.notice}>המוצר נמחק על ידי המוכר ואינו זמין יותר.</p>
        <p className={styles.description}>תיאור: {product.description || "-"}</p>
        <p className={styles.price}>מחיר פתיחה: ₪{product.price ?? "-"}</p>
      </ProductLayout>
    );
  }

  // 5) ברירת מחדל
  return (
    <ProductLayout
      images={images}
      adminPanel={<AdminProductPanel productId={id} />}
    >
      <h1>{product?.product_name || "מוצר"}</h1>
      <p className={styles.notice}>לא נמצאה תצוגה מתאימה לסטטוס הנוכחי.</p>
    </ProductLayout>
  );
}
