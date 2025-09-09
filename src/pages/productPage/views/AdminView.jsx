// src/pages/productPage/views/AdminView.jsx

import React from "react";
import ProductLayout from "../components/ui/ProductLayout";
import AdminProductPanel from "../components/AdminProductPanel";
import SellerRating from "../components/ui/SellerRating";
import OrderDetails from "../components/OrderDetails";
import Box from "../components/ui/Box";
import styles from "../ProductPage.module.css";

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
  id,            // product_id עבור פעולות ניהול
  product,       // אובייקט מוצר מלא
  status,        // סטטוס מנורמל של המוצר ("not sold" / "sale" / "blocked" / "admin blocked" ...)
  saleInfo,      // רשומת מכירה אם קיימת (sale)
  images,        // מערך תמונות ל־ProductLayout
  loading,       // דגל לטעינת אופציות המוכר
  sellerOption,  // "delivery" | "delivery+pickup" (מ־useSellerOptions)
  sellerRating,  // דירוג ממוצע של המוכר
}) {
  /* ----- 1) מוצר שלא נמכר ----- */
  // מציגים פרטי מוצר, הודעת מצב (האם יש זוכה שלא שילם/לא נמכר), מידע על אופן המסירה, ודירוג מוכר.
  if (status === "not sold") {
    const hasWinner =
      product?.winner_id_number != null &&
      String(product.winner_id_number).trim() !== "";

    return (
      <ProductLayout
        images={images}
        adminPanel={
          <div className={styles.adminSection}>
            <AdminProductPanel productId={id} />
          </div>
        }
      >
        <h1>{product.product_name}</h1>

        {hasWinner ? (
          <p
            className={styles.notice}
            style={{ background: "#fff3cd", border: "1px solid #ffeeba", color: "#856404" }}
          >
            הרוכש לא שילם על מוצר זה
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

  /* ----- 2) מוצר שנמכר – פרטי מכירה (צד אדמין) ----- */
  // מציגים OrderDetails עם adminView=true כדי להציג שדות/סטטוס מנוהלים ברמת אדמין.
  if (status === "sale" && saleInfo) {
    return (
      <ProductLayout
        images={images}
        adminPanel={
          <div className={styles.adminSection}>
            <AdminProductPanel productId={id} />
          </div>
        }
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

  /* ----- 3) מוצר חסום/נמחק – הודעת מידע ----- */
  // תצוגה לקהל שאינו בעלים – מסבירה שהמוצר הוסר/נחסם ואינו זמין עוד.
  if (status === "admin blocked" || status === "blocked") {
    return (
      <Box>
        <h3 style={{ marginTop: 0 }}>{product.product_name}</h3>
        <div>
          {status === "admin blocked"
            ? 'מוצר זה נמחק ע"י ההנהלה ואינו זמין יותר'
            : "המוצר נמחק על ידי המוכר ואינו זמין יותר"}
        </div>
        <div style={{ marginTop: 8, color: "#555" }}>
          תיאור: {product.description || "-"}
        </div>
        <div style={{ marginTop: 4, color: "#555" }}>
          מחיר פתיחה: ₪{product.price ?? "-"}
        </div>
      </Box>
    );
  }

  /* ----- 4) ברירת מחדל ----- */
  // לא אמור להגיע לכאן בתרחיש תקין; שומר עקביות.
  return null;
}
