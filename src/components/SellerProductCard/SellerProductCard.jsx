import Product from "../productCard/product"
import styles from "./SellerProductCard.module.css";

export default function SellerProductCard({ product, onOpenDetails }) {
  // נורמליזציה כדי לתמוך בגרסאות שונות של הסטטוס
  const raw = String(product.status || product.product_status || "")
    .trim()
    .toLowerCase();

  let statusText = "לא ידוע";
  let statusTone = "toneGray";
  let statusIcon = "info";

  if (raw === "sale") {
    statusText = "נמכר";
    statusTone = "toneGreen";
    statusIcon = "check";
  } else if (raw === "for sale") {
    statusText = "זמין למכירה";
    statusTone = "toneBlue";
    statusIcon = "tag"; // ← היה 'play'
  } else if (raw === "not sold") {
    statusText = "לא נמכר";
    statusTone = "toneGray";
    statusIcon = "info";
  }

  // זיהוי 'נשלח' בצורה עמידה (1/ "1"/ true / "yes")
  const delivered =
    product.is_deliverd === 1 ||
    product.is_deliverd === "1" ||
    product.sent === "yes";

  const sentLabel = delivered ? "נשלח / נמסר" : "טרם נשלח";
  const deliveryTone = delivered ? "toneGreen" : "toneAmber";

  return (
    <div className={styles.wrapper} aria-label="כרטיס מוצר למוכר">
      {/* הכרטיס המקורי של המוצר — לא נוגעים בו */}
      <Product product={product} showDescription={false} />

      {/* שכבת הניהול (סטטוסים + פעולה) */}
      <div className={styles.cardFooter}>
        <div className={styles.metaRow}>
          <span className={`${styles.badge} ${styles[statusTone]}`}>
            {/* אייקון קטן לפי סטטוס */}
            {statusIcon === "check" ? (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            ) : statusIcon === "tag" ? (
              /* אייקון תג מחיר לזמין למכירה */
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  d="M20.59 13.41L12 4.83V4H5v7h.83l8.59 8.59a2 2 0 0 0 2.83 0l3.34-3.34a2 2 0 0 0 0-2.83zM7 7a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"
                  fill="currentColor"
                />
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

          {raw === "sale" && (
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
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.viewButton}
            onClick={() => onOpenDetails(product)}
          >
            צפייה בפרטים
          </button>
        </div>
      </div>
    </div>
  );
}
