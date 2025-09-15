// src/pages/productPage/views/OwnerView.jsx

import React from "react";
import ProductLayout from "../components/ui/ProductLayout";
import OrderDetails from "../components/OrderDetails";
import styles from "../ProductPage.module.css";

/**
 * OwnerView
 * תצוגת דף המוצר כאשר המשתמש הוא "המוכר" (Owner) של המוצר.
 *
 * עקרונות:
 * 1) חסימות: אם המוצר חסום ע"י ההנהלה / נמחק ע"י המוכר – מציגים הודעת מידע בלבד.
 * 2) מוצר שנמכר: מציגים כרטיס "פרטי הזמנה" בצד המוכר, ללא אפשרות עריכה.
 * 3) מוצר פעיל/לא נמכר: מציגים עורך המוצר (ProductEditor) לעריכה מלאה.
 *
 * אין גישה ל־formatCountdown כאן; אם נדרש בעתיד, יש להעבירו כ־prop ממעלה העץ.
 */
export default function OwnerView({
  id,                 // מזהה המוצר לעריכה
  product,            // אובייקט מוצר מלא
  status,             // סטטוס טקסטואלי מנורמל ("for sale" / "sale" / "blocked" / "admin blocked" וכו')
  saleInfo,           // רשומת מכירה (sale) אם קיימת
  images,             // מערך תמונות להצגה ב־ProductLayout
  startCountdownSec,  // ספירה לאחור לתחילת מכירה (שניות)
  isOwner,            // דגל עזר – האם הצופה הוא אכן המוכר
}) {
  // טעינה דינמית של עורך המוצר (מונע bundle מיותר במסכים שלא זקוקים לעריכה)
  const ProductEditor = require("../components/productEditor").default;

  /* ----- 1) מוצר חסום ע"י הנהלה – אין עריכה ----- */
// ----- 1) מוצר חסום ע"י הנהלה – אין עריכה -----
if (status === "admin blocked") {
  return (
    <ProductLayout images={images}>
      <h1>{product.product_name}</h1>
      <p className={styles.notice}>ההנהלה חסמה מוצר זה, נא לפנות לתמיכה להמשך בירור.</p>
      <p className={styles.description}>תיאור: {product.description || "-"}</p>
      <p className={styles.price}>מחיר פתיחה: ₪{product.price ?? "-"}</p>
    </ProductLayout>
  );
}

// ----- 2) מוצר שנמחק ע"י המוכר – אין עריכה -----
if (status === "blocked") {
  return (
    <ProductLayout images={images}>
      <h1>{product.product_name}</h1>
      <p className={styles.notice}>מחקת מוצר זה.</p>
      <p className={styles.description}>תיאור: {product.description || "-"}</p>
      <p className={styles.price}>מחיר פתיחה: ₪{product.price ?? "-"}</p>
    </ProductLayout>
  );
}


  /* ----- 3) מוצר שנמכר – תצוגת פרטי מכירה בצד המוכר ----- */
  // מציגים ProductLayout + OrderDetails במצב sellerView, ללא יכולת עריכה של המוצר.
  if (status === "sale" && saleInfo) {
    return (
      <ProductLayout images={images}>
        <h1>{product.product_name}</h1>

        {/* הערה: formatCountdown לא מוזרק כאן כ־prop, לכן לא מציגים ספירה. */}
        {!isOwner && (startCountdownSec ?? 0) > 0 && (
          <p className={styles.infoNote}>
            {/* המכרז מתחיל בעוד: ... */}
          </p>
        )}

        <p className={styles.notice}>המוצר נמכר — לא ניתן לערוך.</p>

        <OrderDetails
          sale={saleInfo}
          isWinner={false}   // המוכר אינו הזוכה
          sellerView={true}  // הדגשת תצוגה מותאמת למוכר (כפתורי "נשלח"/"נאסף")
          adminView={false}
        />
      </ProductLayout>
    );
  }

  /* ----- 4) עריכת מוצר (ברירת מחדל) ----- */
  // אם לא נמכר ולא חסום – מאפשרים למוכר לערוך את פרטי המוצר.
  return (
    <ProductEditor
      productId={id}
      onSaved={() => window.history.back()}   // חזרה לעמוד הקודם אחרי שמירה
      onCancel={() => window.history.back()}  // חזרה לעמוד הקודם בביטול
    />
  );
}
