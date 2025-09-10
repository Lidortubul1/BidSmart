import { useEffect, useState } from "react";
import styles from "./SellerCard.module.css";
import { getRegistrationsCount } from "../../services/quotationApi";

function Badge({ tone = "toneGray", children }) {
  return <span className={`${styles.badge} ${styles[tone]}`}>{children}</span>;
}

export default function SellerCard({
  item,
  onOpenDetails,
  onOpenProduct,
  onDelete,
  viewer = "seller",
}) {
  const base = "http://localhost:5000";
  const img  = item?.images?.[0] ? `${base}${item.images[0]}` : "";
  const name = item?.product_name || "מוצר";

  const norm = (v) => String(v ?? "").trim().toLowerCase();
  const rawStatus = norm(item?.status || item?.product_status).replace(/[_\s]+/g, " ");

  // 🔎 האם יש זוכה?
  const hasWinner = String(item?.winner_id_number ?? "").trim() !== "";

  // ברירת מחדל לסטטוס
  let statusText = "לא ידוע", statusTone = "toneGray";
  if (rawStatus === "sale")          { statusText = "נמכר";           statusTone = "toneGreen"; }
  else if (rawStatus === "for sale") { statusText = "זמין למכירה";   statusTone = "toneBlue";  }
  else if (rawStatus === "not sold") { statusText = "לא נמכר";        statusTone = "toneGray";  }
  else if (rawStatus === "blocked")  { statusText = "מוצר נחסם";      statusTone = "toneRed";   }
  else if (rawStatus === "admin blocked") { statusText = "נחסם ע״י ההנהלה"; statusTone = "toneRed"; }

  // ✅ אם 'for sale' אבל כבר יש זוכה — מציגים "טרם שולם"
  if (rawStatus === "for sale" && hasWinner) {
    statusText = "טרם שולם";
    statusTone = "toneAmber";
  }

  // --- כמות נרשמים ---
  const [registrations, setRegistrations] = useState(null); // null=טוען
  useEffect(() => {
    let alive = true;
    async function load() {
      if (!item?.product_id) { setRegistrations(0); return; }
      try {
        const c = await getRegistrationsCount(item.product_id);
        if (alive) setRegistrations(c);
      } catch {
        if (alive) setRegistrations(0);
      }
    }
    load();
    return () => { alive = false; };
  }, [item?.product_id]);

  // נתונים לתצוגה
  const openingPrice  = Number(item?.price ?? 0) || null;
  const currentPrice  = Number(item?.current_price ?? 0) || null;
  const registerUntil = item?.start_date ? new Date(item.start_date) : null;

  // סטטוס מסירה
  const method      = norm(item?.delivery_method);
  const isDelivered = ["1", "true"].includes(norm(item?.is_delivered));
  const isSent      = ["yes", "1", "true"].includes(norm(item?.sent));

  // שלמות כתובת למשלוח
  const hasDeliveryAddress = (() => {
    const city   = String(item?.city ?? "").trim();
    const street = String(item?.street ?? "").trim();
    const house  = String(item?.house_number ?? "").trim();
    const zip    = String(item?.zip ?? "").trim();
    return !!(city && street && (house || zip));
  })();

  let deliveryLabel = "שיטת מסירה לא הוגדרה";
  if (rawStatus === "sale") {
    if (method === "delivery") {
      deliveryLabel = !hasDeliveryAddress
        ? "טרם התקבל בחירת משלוח"
        : (isDelivered ? "נמסר ללקוח" : (isSent ? "נשלח" : "ממתין לשליחה"));
    } else if (method === "pickup") {
      deliveryLabel = isDelivered ? "נאסף ע״י הלקוח" : "ממתין לאיסוף";
    }
  }

  const deliveryTone = isDelivered ? "toneGreen" : (method ? "toneAmber" : "toneGray");

  // תנאים לתצוגה
  const isSold    = rawStatus === "sale";
  const isForSale = rawStatus === "for sale";
  const isPendingPayment = isForSale && hasWinner; // מצב "טרם שולם"

  // כפתור "פעולות משלוח" רק עם בחירת מסירה תקפה
  const hasValidShippingSelection =
    isSold && (method === "pickup" || (method === "delivery" && hasDeliveryAddress));

  function goToProductPage() {
    if (onOpenProduct) return onOpenProduct(item);
    if (item?.product_id) window.location.href = `/product/${item.product_id}`;
  }

  // תווית הכפתור הראשי
  const primaryBtnLabel = isPendingPayment
    ? "צפייה נרחבת"
    : (isForSale ? "עריכת פרטי מוצר" : "צפייה נרחבת");

  return (
    <div className={styles.card} dir="rtl">
      <div
        className={styles.cardHead}
        onClick={hasValidShippingSelection ? onOpenDetails : goToProductPage}
        role="button"
        tabIndex={0}
      >
        {img ? <img className={styles.cardImg} src={img} alt={name} /> : <div className={styles.noImg}>אין תמונה</div>}
        <div className={styles.cardTitleWrap}>
          <h3 className={styles.cardTitle} title={name}>{name}</h3>
          <Badge tone={statusTone}>סטטוס: {statusText}</Badge>
          {isSold && <Badge tone={deliveryTone}>סטטוס מסירה: {deliveryLabel}</Badge>}
        </div>
      </div>

      <div className={styles.cardBody}>
        {/* כמות נרשמים – מעל מחיר פתיחה */}
        <div className={styles.row}>
          <span className={styles.label}>כמות נרשמים למוצר:</span>
          <span>{registrations === null ? "..." : registrations}</span>
        </div>

        <div className={styles.row}>
          <span className={styles.label}>מחיר פתיחה:</span>
          <span>{openingPrice ? `${openingPrice.toLocaleString("he-IL")} ₪` : "-"}</span>
        </div>

        {/* מחיר סופי: מוצג אם נמכר או אם טרם שולם (יש זוכה) */}
        {(isSold || isPendingPayment) && (
          <div className={styles.row}>
            <span className={styles.label}>מחיר סופי:</span>
            <span>{currentPrice ? `${currentPrice.toLocaleString("he-IL")} ₪` : "-"}</span>
          </div>
        )}

        {/* "ניתן להירשם עד" – רק למוצרים ש"זמינים למכירה" ואינם "טרם שולם" */}
        {isForSale && !isPendingPayment && (
          <div className={styles.row}>
            <span className={styles.label}>ניתן להירשם עד:</span>
            <span>
              {registerUntil
                ? `${registerUntil.toLocaleDateString("he-IL")} ${registerUntil.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}`
                : "-"}
            </span>
          </div>
        )}
      </div>

      <div className={styles.cardFooter}>
        <button type="button" className={styles.viewButton} onClick={goToProductPage}>
          {primaryBtnLabel}
        </button>

        {hasValidShippingSelection && (
          <button type="button" className={styles.viewButton} onClick={onOpenDetails}>
            פעולות ופרטי משלוח
          </button>
        )}

        {viewer === "admin" && onDelete && (
          <button type="button" className={styles.deleteBtn} onClick={onDelete} title="מחק מוצר">
            🗑️ מחק
          </button>
        )}
      </div>
    </div>
  );
}
