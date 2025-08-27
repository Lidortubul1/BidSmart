// src/components/ProductCardUnified/ProductCardUnified.jsx
//כרטיס מוצר של מוכר או מנהל
import Product from "../productCard/product";
// אפשר למחזר את ה-CSS של כרטיס המוכר כדי לשמור מראה אחיד:
import styles from "./ProductCardUnified.module.css"

//קומפוננטה של כרטיס של מנהל
export default function ProductCardUnified({
  product,
  viewer = "seller",           // "seller" | "admin"
  onOpenDetails,
  onDelete,                    // אופציונלי – עבור מנהל
  rightExtra,                  // JSX אופציונלי (תגים/כפתורים)
}) {
  // סטטוס (נורמליזציה)
  const rawStatus = String(product.status || product.product_status || "")
    .trim()
    .toLowerCase();

  let statusText = "לא ידוע";
  let statusTone = "toneGray";
  let statusIcon = "info";

  if (rawStatus === "sale") {
    statusText = "נמכר";
    statusTone = "toneGreen";
    statusIcon = "check";
  } else if (rawStatus === "for sale" || rawStatus === "for_sale") {
    statusText = "זמין למכירה";
    statusTone = "toneBlue";
    statusIcon = "tag";
  } else if (rawStatus === "not sold" || rawStatus === "not_sold") {
    statusText = "לא נמכר";
    statusTone = "toneGray";
    statusIcon = "info";
  } else if (rawStatus === "blocked") {
    statusText = "מוצר נחסם";
    statusTone = "toneRed";
    statusIcon = "ban";
  }else if (rawStatus === "admin blocked") {
    statusText = "מוצר נחסם על ידי ההנהלה";
    statusTone = "toneRed";
    statusIcon = "ban";
  }

  // משלוח/איסוף (מוצג רק כשנמכר)
  const method = String(product.delivery_method || "").toLowerCase();
  const delivered =
    product.is_delivered === 1 ||
    product.is_delivered === "1" ||
    String(product.sent).toLowerCase() === "yes";

  const sentLabel =
    method === "delivery"
      ? delivered
        ? "המוצר נשלח"
        : "מיועד לשליחה"
      : method === "pickup"
      ? delivered
        ? "המוצר נאסף"
        : "מיועד לאיסוף עצמי"
      : delivered
      ? "נשלח / נמסר"
      : "שיטת מסירה לא הוגדרה";

  const deliveryTone = delivered ? "toneGreen" : "toneAmber";

  return (
    <div className={styles.wrapper} aria-label="כרטיס מוצר">
      {/* כרטיס התצוגה הבסיסי של המוצר */}
      <Product product={product} showDescription={false} />

      {/* שכבת מטה/פעולות */}
      <div className={styles.cardFooter}>
        <div className={styles.metaRow}>
          <span className={`${styles.badge} ${styles[statusTone]}`}>
            {/* אייקון זעיר לפי סטטוס */}
            {statusIcon === "check" ? (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            ) : statusIcon === "tag" ? (
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  d="M20.59 13.41L12 4.83V4H5v7h.83l8.59 8.59a2 2 0 0 0 2.83 0l3.34-3.34a2 2 0 0 0 0-2.83zM7 7a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"
                  fill="currentColor"
                />
              </svg>
            ) : statusIcon === "ban" ? (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm5 10a4.98 4.98 0 01-1.02 3.03L8.97 8.02A5 5 0 0117 12zM7 12a4.98 4.98 0 011.02-3.03l7.01 7.01A5 5 0 017 12z" fill="currentColor"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M12 22A10 10 0 1 1 12 2a10 10 0 0 1 0 20zm-1-6h2v2h-2v-2zm0-10h2v8h-2V6z"
                  fill="currentColor"
                />
              </svg>
            )}
            <span>סטטוס מוצר: {statusText}</span>
          </span>

          {/* כשנמכר – מציגים סטטוס משלוח/איסוף */}
          {rawStatus === "sale" && (
            <span className={`${styles.badge} ${styles[deliveryTone]}`}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M3 7h13v10H3zM16 10h4l1 2v5h-5zM6 19a2 2 0 110-4 2 2 0 010 4zm10 0a2 2 0 110-4 2 2 0 010 4z"
                  fill="currentColor"
                />
              </svg>
              <span>סטטוס משלוח: {sentLabel}</span>
            </span>
          )}

          {/* תגים ייעודיים למנהל */}
{/* תגים ייעודיים למנהל: שם מוכר + ת"ז */}
{viewer === "admin" && (product.seller_name || product.seller_id_number) && (
  <span
    className={`${styles.badge} ${styles.toneBlue}`}
    title="פרטי המוכר"
  >
    👤 {product.seller_name || "מוכר לא ידוע"}
    {product.seller_id_number ? ` (ת״ז ${product.seller_id_number})` : ""}
  </span>
)}

          {rightExtra}
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.viewButton}
            onClick={() => onOpenDetails?.(product)}
          >
            צפייה בפרטים
          </button>

          {viewer === "admin" && onDelete && (
            <button
              type="button"
              className={styles.viewButton}
              onClick={() => onDelete(product)}
              title="מחק מוצר"
              style={{ background: "#fff1f2", color: "#b91c1c", borderColor: "#fecdd3" }}
            >
              🗑️ מחק
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
