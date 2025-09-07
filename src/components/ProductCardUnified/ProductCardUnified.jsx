// src/components/ProductCardUnified/ProductCardUnified.jsx
// כרטיס מוצר מאוחד (Seller/Admin):
// מציג כרטיס מוצר בסיסי + פוטר עם תגים דינמיים:
// - סטטוס מוצר (for sale / sale / not sold / blocked / admin blocked)
// - כמות נרשמים (נטען מהשרת)
// - למוצר שנמכר: סטטוס מסירה (משלוח/איסוף, נשלח/נמסר)
// - בפרופיל מנהל: שם ות״ז המוכר
// כולל פעולות: “צפייה בפרטים” ולמנהל גם “מחק”; תומך בתוכן נוסף דרך rightExtra.

import { useEffect, useState } from "react";            
import Product from "../productCard/product";
import styles from "./ProductCardUnified.module.css";
import { getRegistrationsCount } from "../../services/quotationApi"; 

export default function ProductCardUnified({
  product,
  viewer = "seller",
  onOpenDetails,
  onDelete,
  rightExtra,
}) {
  //  ספירת נרשמים
  const [registrations, setRegistrations] = useState(null); // null=טוען, מספר=תוצאה

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!product?.product_id) {
        setRegistrations(0);
        return;
      }
      try {
        const c = await getRegistrationsCount(product.product_id);
        if (alive) setRegistrations(c);
      } catch {
        if (alive) setRegistrations(0);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [product?.product_id]);

  // --- סטטוס (נורמליזציה) ---
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
  } else if (rawStatus === "for sale") {
    statusText = "זמין למכירה";
    statusTone = "toneBlue";
    statusIcon = "tag";
  } else if (rawStatus === "not sold") {
    statusText = "לא נמכר";
    statusTone = "toneGray";
    statusIcon = "info";
  } else if (rawStatus === "blocked") {
    statusText = "מוצר נחסם";
    statusTone = "toneRed";
    statusIcon = "ban";
  } else if (rawStatus === "admin blocked") {
    statusText = "מוצר נחסם על ידי ההנהלה";
    statusTone = "toneRed";
    statusIcon = "ban";
  }

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
      <Product product={product} showDescription={false} />

      <div className={styles.cardFooter}>
        <div className={styles.metaRow}>
          {/* תג סטטוס */}
          <span className={`${styles.badge} ${styles[statusTone]}`}>
            {/* ...SVG לפי statusIcon (ללא שינוי) ... */}
            <span>סטטוס מוצר: {statusText}</span>
          </span>

          {/* ▼ כמות נרשמים – ליד הסטטוס */}
          <span className={`${styles.badge} ${styles.toneBlue}`} title="כמות נרשמים למוצר">
            🧾 כמות נרשמים: {registrations === null ? "..." : registrations}
          </span>

          {/* כשנמכר – סטטוס משלוח/איסוף */}
          {rawStatus === "sale" && (
            <span className={`${styles.badge} ${styles[deliveryTone]}`}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 7h13v10H3zM16 10h4l1 2v5h-5zM6 19a2 2 0 110-4 2 2 0 010 4zm10 0a2 2 0 110-4 2 2 0 010 4z" fill="currentColor" />
              </svg>
              <span>סטטוס משלוח: {sentLabel}</span>
            </span>
          )}

          {/* תגים ייעודיים למנהל: שם מוכר + ת"ז */}
          {viewer === "admin" && (product.seller_name || product.seller_id_number) && (
            <span className={`${styles.badge} ${styles.toneBlue}`} title="פרטי המוכר">
              👤 {product.seller_name || "מוכר לא ידוע"}
              {product.seller_id_number ? ` (ת״ז ${product.seller_id_number})` : ""}
            </span>
          )}

          {rightExtra}
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.viewButton} onClick={() => onOpenDetails?.(product)}>
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
