import { useAuth } from "../../auth/AuthContext";
import styles from "./MyBidsPage.module.css";

/**
 * תגית סטטוס קטנה לכרטיס (עיצוב בלבד)
 * tone* מגיע מ־CSS module (למשל toneBlue/toneGreen/toneAmber)
 */
function Badge({ tone = "toneGray", children }) {
  return <span className={`${styles.badge} ${styles[tone]}`}>{children}</span>;
}

/**
 * BuyerCard – כרטיס פריט עבור רוכש (גם "נרשמתי" וגם "זכיתי")
 *
 * props:
 * - kind: "registered" | "won" → קובע אילו שדות מוצגים ואיזה טקסט סטטוס
 * - item: אובייקט מאוחד (מוצר/מכירה) עם שדות כמו product_name, images, delivery_method...
 * - onMarkDelivered: callback ללחיצה על "סמן כבוצע/נאסף" (במצב won)
 * - onOpenProduct: ניווט לעמוד המוצר/הזמנה
 * - pending: האם פעולה בעיבוד (משביתת את הכפתור כדי למנוע דאבל-קליק)
 */
export default function BuyerCard({
  kind,
  item,
  onMarkDelivered,
  onOpenProduct,
  pending,
}) {
  const base = "http://localhost:5000"; // בסיס כתובת לתמונות
  const { user } = useAuth();

  // בניית URL לתמונה ראשונה (אם קיימת)
  const img = item?.images?.[0] ? `${base}${item.images[0]}` : "";

  // כותרת הכרטיס
  const name = item?.product_name || "מוצר";

  // המרה ל־Date להצגת תאריך/שעה
  const startDate = item?.start_date ? new Date(item.start_date) : null;

  const isWinner = String(item?.winner_id_number) === String(user?.id_number);

  // פונקציית עזר לנירמול מחרוזות
  const norm = (v) => String(v ?? "").toLowerCase().trim();

  // סטטוס משלוח
  const method = norm(item?.delivery_method); // "delivery" | "pickup" | ""
  const isDelivered =
    norm(item?.is_delivered) === "1" || norm(item?.is_delivered) === "true";
  const isSent =
    norm(item?.sent) === "yes" ||
    norm(item?.sent) === "1" ||
    norm(item?.sent) === "true";

  // בדיקה אם קיימת כתובת משלוח
  const hasDeliveryAddress = (() => {
    const val = (x) => String(x ?? "").trim();
    const flatFields = [
      "delivery_address",
      "shipping_address",
      "address",
      "street",
      "city",
      "house_number",
      "zip",
      "postal_code",
    ];

    const hasFlat = flatFields.some((f) => val(item?.[f]));

    const nestedCandidates = [
      item?.shipping_details?.address_line1,
      item?.shipping_details?.city,
      item?.shipping_details?.zip,
      item?.delivery_details?.address_line1,
      item?.delivery_details?.city,
      item?.delivery_details?.zip,
    ];

    const hasNested = nestedCandidates.some((x) => val(x));

    return hasFlat || hasNested;
  })();

  // מזהי "הזוכה שטרם שילם"
  const winnerIsUser = String(item?.winner_id_number) === String(user?.id_number);
  const statusForSale = norm(item?.product_status) === "for sale";
  const unpaidWinner = winnerIsUser && statusForSale;

  // טקסט סטטוס למשתמש רשום
  let registeredLabel = "נרשמת למכירה";
  if (kind === "registered") {
    const isLive0 = String(item?.is_live) === "0";
    const hasNoWinner = !item?.winner_id_number;
    const winnerIsUserLocal = item?.winner_id_number === user?.id_number;
    const isPaidNo = ["no", "0", "false"].includes(norm(item?.is_paid));

    const lastBidTimeLocal = item?.last_bid_time
      ? new Date(item.last_bid_time)
      : null;
    const hoursPassedLocal = lastBidTimeLocal
      ? (Date.now() - lastBidTimeLocal.getTime()) / (1000 * 60 * 60)
      : 0;
    const isOver24Hours = hoursPassedLocal >= 24;

    if (winnerIsUserLocal && statusForSale) {
      registeredLabel = "טרם שולם";
    } else if (winnerIsUserLocal && isPaidNo && isOver24Hours) {
      registeredLabel = "זכיה בוטלה - אי תשלום";
    } else if (!winnerIsUserLocal && isOver24Hours && isPaidNo) {
      registeredLabel = "המכירה הסתיימה: לא זכית";
    } else if (isLive0 && statusForSale && hasNoWinner) {
      registeredLabel = "המכירה טרם החלה";
    } else if (winnerIsUserLocal && norm(item?.is_paid) === "yes") {
      registeredLabel = "אתה הזוכה במכירה";
    } else {
      registeredLabel = "המכירה הסתיימה:\nלא זכית";
    }
  }

  // זמן מאז ההצעה האחרונה או זמן ההתחלה
  const lastBidTime = item?.last_bid_time
    ? new Date(item.last_bid_time)
    : item?.start_date
    ? new Date(item.start_date)
    : null;
  const hoursPassed = lastBidTime
    ? (Date.now() - lastBidTime.getTime()) / (1000 * 60 * 60)
    : Infinity;
  const isOver24h = hoursPassed >= 24;
  const isPaidNoGlobal = ["no", "0", "false"].includes(norm(item?.is_paid));
  const unpaidOver24h = winnerIsUser && isPaidNoGlobal && isOver24h;

  // טקסט סטטוס המסירה למשתמש זוכה
  let sentLabel = "שיטת מסירה לא הוגדרה";
  if (unpaidOver24h) {
    sentLabel = "זכיה בוטלה — אי תשלום";
  } else if (unpaidWinner) {
    sentLabel = "טרם שולם";
  } else if (method === "delivery") {
    if (!hasDeliveryAddress) {
      sentLabel = "לחץ כדיי לבחור אופציית משלוח";
    } else {
      sentLabel = isDelivered ? "אושר שההתקבל" : isSent ? "נשלח" : "טרם נשלח";
    }
  } else if (method === "pickup") {
    sentLabel = isDelivered ? "אושר שנאסף" : "טרם נאסף";
  }

  // גוון תגית הסטטוס
  const deliveryTone = isDelivered ? "toneGreen" : method ? "toneAmber" : "toneGray";


  // טקסט שיטת מסירה עבור הכרטיס won
let deliveryText = "לא הוגדר";
if (method === "delivery") {
  const city = item?.city;
  const street = item?.street;
  const houseNumber = item?.house_number;

  if (city && street && houseNumber) {
    deliveryText = "משלוח";
  } else {
    deliveryText = "לא הוגדר";
  }
} else if (method === "pickup") {
  deliveryText = "איסוף עצמי";
}


  return (
    <div className={styles.card} dir="rtl">
      {/* ראש הכרטיס */}
      <div
        className={styles.cardHead}
        onClick={onOpenProduct}
        role="button"
        tabIndex={0}
      >
        {img ? (
          <img className={styles.cardImg} src={img} alt={name} />
        ) : (
          <div className={styles.noImg}>אין תמונה</div>
        )}

        <div className={styles.cardTitleWrap}>
          <h3 className={styles.cardTitle} title={name}>
            {name}
          </h3>
          {kind === "registered" ? (
            <Badge tone="toneBlue">{registeredLabel}</Badge>
          ) : (
            <Badge tone={deliveryTone}>{"סטטוס:\n" + sentLabel}</Badge>
          )}
        </div>
      </div>

      {/* גוף הכרטיס */}
      <div className={styles.cardBody}>
        {(kind === "registered" || kind === "won") && (
          <>
            {/* תאריך ושעה עבור מכירה ללא זוכה */}
            {!item?.winner_id_number && statusForSale && (
              <>
                <div className={styles.row}>
                  <span className={styles.label}>תאריך התחלה:</span>
                  <span>
                    {startDate
                      ? startDate.toLocaleDateString("he-IL")
                      : "-"}
                  </span>
                </div>
                <div className={styles.row}>
                  <span className={styles.label}>שעת התחלה:</span>
                  <span>
                    {startDate
                      ? startDate.toLocaleTimeString("he-IL", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "-"}
                  </span>
                </div>
                <div className={styles.row}>
                  <span className={styles.label}>מחיר פתיחה:</span>
                  <span>{item?.price ?? "-"}</span>
                </div>
              </>
            )}

            {/* תאריך ושעה עבור הזוכה */}
            {item?.winner_id_number && isWinner && (
              <>
                <div className={styles.row}>
                  <span className={styles.label}>תאריך זכייה:</span>
                  <span>
                    {item?.last_bid_time
                      ? new Date(item.last_bid_time).toLocaleDateString(
                          "he-IL"
                        )
                      : "-"}
                  </span>
                </div>
                <div className={styles.row}>
                  <span className={styles.label}>שעת זכייה:</span>
                  <span>
                    {item?.last_bid_time
                      ? new Date(item.last_bid_time).toLocaleTimeString(
                          "he-IL",
                          { hour: "2-digit", minute: "2-digit" }
                        )
                      : "-"}
                  </span>
                </div>
                <div className={styles.row}>
                  <span className={styles.label}>מחיר סופי:</span>
                  <span>{item?.current_price ?? "-"}</span>
                </div>
              </>
            )}
          </>
        )}

        {/* שדות נוספים בכרטיס won */}
       {/* שדות נוספים בכרטיס won */}
{kind === "won" && sentLabel !== "זכיה בוטלה — אי תשלום" && (
  <>
    <div className={styles.row}>
      <span className={styles.label}>שיטת מסירה:</span>
      <span>{deliveryText}</span>
    </div>

    {item?.rating != null && (
      <div className={styles.row}>
        <span className={styles.label}>הדירוג שלך:</span>
        <span>
          {Array.from({ length: 5 }).map((_, i) =>
            i < Math.round(item.rating) ? "★" : "☆"
          )}
          <span style={{ marginInlineStart: 6 }}>({item.rating})</span>
        </span>
      </div>
    )}
  </>
)}


      </div>

      {/* תחתית הכרטיס */}
      <div className={styles.cardFooter}>
        <button
          className={styles.viewButton}
          type="button"
          onClick={onOpenProduct}
        >
          צפייה בפרטי ההזמנה
        </button>

        {kind === "won" && method === "delivery" && isSent && !isDelivered && (
          <button
            className={styles.primaryBtn}
            type="button"
            onClick={onMarkDelivered}
            disabled={pending}
          >
            {pending ? "מעבד..." : "סמן שהתקבל"}
          </button>
        )}

        {kind === "won" && method === "pickup" && !isDelivered && (
          <button
            className={styles.primaryBtn}
            type="button"
            onClick={onMarkDelivered}
            disabled={pending}
          >
            {pending ? "מעבד..." : "סמן שנאסף"}
          </button>
        )}
      </div>
    </div>
  );
}
