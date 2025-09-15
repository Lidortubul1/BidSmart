// src/components/ProductCardUnified/ProductCardUnified.jsx
// כרטיס מוצר מאוחד (Seller/Admin) – עיצוב והתנהגות כמו SellerCard

import { useEffect, useState } from "react";
import styles from "./ProductCardUnified.module.css";
import { getRegistrationsCount } from "../../services/quotationApi";

function Badge({ tone = "toneGray", children }) {
  return <span className={`${styles.badge} ${styles[tone]}`}>{children}</span>;
}

export default function ProductCardUnified({
  product,
  item: itemProp,          // אופציונלי: אפשר להעביר item כמו ב-SellerCard
  viewer = "seller",
  onOpenDetails,
  onOpenProduct,
  onDelete,
  rightExtra,              // אופציונלי: יוצג בפוטר ליד הכפתורים
}) {
  // מקור נתונים מאוחד
  const item = itemProp || product || {};

  // --- כמות נרשמים ---
  const [registrations, setRegistrations] = useState(null);
  const productId = item?.product_id ?? item?.id;

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!productId) { setRegistrations(0); return; }
      try {
        const c = await getRegistrationsCount(productId);
        if (alive) setRegistrations(c);
      } catch {
        if (alive) setRegistrations(0);
      }
    }
    load();
    return () => { alive = false; };
  }, [productId]);

  // תמונה/שם – כמו SellerCard
  const base = "http://localhost:5000";
  const img  = item?.images?.[0] ? `${base}${item.images[0]}` : "";
  const name = item?.product_name || item?.name || "מוצר";

  // --- סטטוסים (כמו SellerCard) ---
  const norm = (v) => String(v ?? "").trim().toLowerCase();
  const rawStatus = norm(item?.status || item?.product_status).replace(/[_\s]+/g, " ");

  const hasWinner = String(item?.winner_id_number ?? "").trim() !== "";

  let statusText = "לא ידוע", statusTone = "toneGray";
  if (rawStatus === "sale")                { statusText = "נמכר";           statusTone = "toneGreen"; }
  else if (rawStatus === "for sale")       { statusText = "זמין למכירה";   statusTone = "toneBlue";  }
  else if (rawStatus === "not sold")       { statusText = "לא נמכר";        statusTone = "toneGray";  }
  else if (rawStatus === "blocked")        { statusText = "מוצר נחסם";      statusTone = "toneRed";   }
  else if (rawStatus === "admin blocked")  { statusText = "נחסם ע״י ההנהלה"; statusTone = "toneRed";  }

  // אם 'for sale' אבל כבר יש זוכה — "טרם שולם"
  const isForSale        = rawStatus === "for sale";
  const isSold           = rawStatus === "sale";
  const isPendingPayment = isForSale && hasWinner;
  if (isPendingPayment) {
    statusText = "טרם שולם";
    statusTone = "toneAmber";
  }

  // נתונים לתצוגה
  // עוזרים קטנים לבחור שדה ראשון שקיים + להמיר למספר נקי
// עוזרים קטנים לבחור שדה ראשון שקיים + להמיר למספר נקי
const pick = (...cands) => cands.find(v => v !== undefined && v !== null && v !== "");
const toNum = (v) => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(String(v).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
};

// --- סורק חכם: אם לא נמצא באליוסים הידועים, נסרוק מפתחות שנשמעים כמו "מחיר פתיחה"
function smartScanOpeningPrice(obj) {
  try {
    for (const [k, v] of Object.entries(obj || {})) {
      if (v === undefined || v === null || v === "") continue;
      const key = k.toLowerCase();
      // מחפש מפתחות שמכילים גם "price/bid/amount" וגם "open/start/initial/base/min"
      const looksLikePrice = /(price|bid|amount)/.test(key);
      const looksLikeOpening = /(open|opening|start|starting|initial|base|min|minimum)/.test(key);
      if (looksLikePrice && looksLikeOpening) {
        const n = toNum(v);
        if (n !== null) return n;
      }
    }
  } catch {}
  return null;
}

// מחיר פתיחה — תמיכה בשמות שונים מה-API + סריקה חכמה
const openingPrice = (
  toNum(pick(
    item?.price,
    item?.opening_price, item?.openingPrice,
    item?.start_price, item?.starting_price, item?.startPrice,
    item?.initial_price, item?.initialPrice,
    item?.base_price, item?.basePrice,
    item?.starting_bid, item?.startingBid,
    item?.minimum_price, item?.minimumPrice,
    item?.min_price, item?.minPrice
  )) ?? smartScanOpeningPrice(item)
);

// מחיר נוכחי/סופי (נשאיר כמו שהיה, אפשר להרחיב מעט)
const currentPrice = toNum(pick(
  item?.current_price, item?.currentPrice,
  item?.final_price, item?.finalPrice
));


  const registerUntil = item?.start_date ? new Date(item.start_date) : null;

  // --- סטטוס מסירה (כמו SellerCard) ---
  const method      = norm(item?.delivery_method);
  const isDelivered = ["1", "true"].includes(norm(item?.is_delivered));
  const isSent      = ["yes", "1", "true"].includes(norm(item?.sent));

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

  // כפתור "פעולות משלוח" רק עם בחירת מסירה תקפה
  const hasValidShippingSelection =
    isSold && (method === "pickup" || (method === "delivery" && hasDeliveryAddress));

  function goToProductPage() {
  if (onOpenProduct) return onOpenProduct(item);
  if (productId) window.location.href = `/product/${productId}`;
}


  // תווית הכפתור הראשי – זהה ל-SellerCard
// תמיד צפייה נרחבת
const primaryBtnLabel = "צפייה נרחבת";

  return (
    <div className={styles.card} dir="rtl" aria-label="כרטיס מוצר">
      {/* ראש הכרטיס – לחיץ כמו SellerCard */}
      <div
        className={styles.cardHead}
        onClick={hasValidShippingSelection ? () => onOpenDetails?.(item) : goToProductPage}
        role="button"
        tabIndex={0}
      >
        {img ? (
          <img className={styles.cardImg} src={img} alt={name} />
        ) : (
          <div className={styles.noImg}>אין תמונה</div>
        )}

        <div className={styles.cardTitleWrap}>
          <h3 className={styles.cardTitle} title={name}>{name}</h3>
          <Badge tone={statusTone}>סטטוס: {statusText}</Badge>
          {isSold && <Badge tone={deliveryTone}>סטטוס מסירה: {deliveryLabel}</Badge>}
        </div>
      </div>

      {/* גוף הכרטיס – זהה ל-SellerCard */}
      <div className={styles.cardBody}>
        <div className={styles.row}>
          <span className={styles.label}>כמות נרשמים למוצר:</span>
          <span>{registrations === null ? "..." : registrations}</span>
        </div>

        <div className={styles.row}>
          <span className={styles.label}>מחיר פתיחה:</span>
<span>{openingPrice !== null ? `${openingPrice.toLocaleString("he-IL")} ₪` : "-"}</span>
        </div>

        {(isSold || isPendingPayment) && (
          <div className={styles.row}>
            <span className={styles.label}>מחיר סופי:</span>
            <span>{currentPrice !== null ? `${currentPrice.toLocaleString("he-IL")} ₪` : "-"}</span>
          </div>
        )}

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

      {/* פוטר – כמו SellerCard */}
      <div className={styles.cardFooter}>
        <button type="button" className={styles.viewButton} onClick={() => onOpenDetails?.(item)}>
          {primaryBtnLabel}
        </button>

        {rightExtra /* אופציונלי: תגים/כפתור נוסף בסגנון linkBtn שיועבר מההורה */ }

        {viewer === "admin" && onDelete && (
          <button
            type="button"
            className={styles.deleteBtn}
            onClick={() => onDelete(item)}
            title="מחק מוצר"
          >
            🗑️ מחק
          </button>
        )}
      </div>
    </div>
  );
}
