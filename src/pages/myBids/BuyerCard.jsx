import { useAuth } from "../../auth/AuthContext";
import styles from "./MyBidsPage.module.css";

/**
 * תגית סטטוס קטנה לכרטיס (עיצוב בלבד).
 * tone* מגיע מ־CSS module (למשל toneBlue/toneGreen/toneAmber).
 */
function Badge({ tone = "toneGray", children }) {
  return <span className={`${styles.badge} ${styles[tone]}`}>{children}</span>;
}

/**
 * BuyerCard – כרטיס פריט עבור רוכש (גם "נרשמתי" וגם "זכיתי")
 *
 * props:
 * - kind: "registered" | "won"  → קובע אילו שדות מוצגים ואיזה טקסט סטטוס
 * - item: אובייקט מאוחד (מוצר/מכירה) עם שדות כמו product_name, images, delivery_method...
 * - onMarkDelivered: callback ללחיצה על "סמן כבוצע/נאסף" (במצב win)
 * - onOpenProduct: ניווט לעמוד המוצר/הזמנה
 * - pending: האם פעולה בעיבוד (משביתת את הכפתור כדי למנוע דאבל-קליק)
 */
export default function BuyerCard({
  kind,                 // "registered" | "won"
  item,                 // אובייקט מאוחד של מכירה/מוצר
  onMarkDelivered,      // קליק על "סמן כבוצע/נאסף"
  onOpenProduct,        // כניסה לעמוד המוצר/הזמנה
  pending,              // סטטוס שמירה (כיבוי כפתור)
}) {
  // בסיס כתובת לתמונות (להחלפה בסביבת production/ENV)
  const base = "http://localhost:5000";

  // בניית URL לתמונה ראשונה (אם קיימת), אחרת יציג placeholder "אין תמונה"
  const img  = item?.images?.[0] ? `${base}${item.images[0]}` : "";

  // טקסט כותרת הכרטיס
  const name = item?.product_name || "מוצר";

  // המרה ל־Date להצגת תאריך/שעה (שדות יכולים להיות null/undefined)
  const startDate = item?.start_date ? new Date(item.start_date) : null;

  // גישה למזהה משתמש מחובר כדי לבדוק אם הוא הזוכה
  const { user } = useAuth();

  // פונקציית עזר לנירמול מחרוזות: lower-case, trim, טיפול ב-null/undefined
  const norm        = (v) => String(v ?? "").toLowerCase().trim();

  // שיטת מסירה לצורך טקסט סטטוס (delivery/pickup/"" למקרה שלא הוגדר)
  const method      = norm(item?.delivery_method); // "delivery" | "pickup" | ""
  // דגלים לסטטוסי משלוח: נמסר/נשלח (מקבלים ערכים שונים מסוגים שונים ולכן מנורמלים)
  const isDelivered = norm(item?.is_delivered) === "1" || norm(item?.is_delivered) === "true";
  const isSent      = norm(item?.sent) === "yes" || norm(item?.sent) === "1" || norm(item?.sent) === "true";
  // בדיקה כללית אם יש כתובת משלוח ברשומת המכירה (שמות שדות נפוצים)
  const hasDeliveryAddress = (() => {
  const val = (x) => String(x ?? "").trim();
  const flatFields = [
    "delivery_address", "shipping_address", "address",
    "street", "city", "house_number", "zip", "postal_code",
  ];
  // בדיקה בשדות שטוחים
  const hasFlat = flatFields.some((f) => val(item?.[f]));

  // בדיקה גם במבנים מקוננים נפוצים (אם קיימים)
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

// NEW: מזהי "הזוכה שטרם שילם"
const winnerIsUser  = String(item?.winner_id_number) === String(user?.id_number);
const statusForSale = norm(item?.product_status) === "for sale";
const unpaidWinner  = winnerIsUser && statusForSale;

// טקסט הסטטוס שיוצג בכרטיס כאשר kind === "registered"
// ברירת מחדל: נרשמת למכירה
let registeredLabel = "נרשמת למכירה";
if (kind === "registered") {
  const isLive0       = String(item?.is_live) === "0";
  const statusForSale = norm(item?.product_status) === "for sale";
  const hasNoWinner   = !item?.winner_id_number;
  const statusNotSold = norm(item?.product_status) === "not sold";
  const winnerIsUser  = item?.winner_id_number === user?.id_number;
  const isPaidNo      = ["no", "0", "false"].includes(norm(item?.is_paid));

  // 1) אם אתה הזוכה והמוצר עדיין מסומן "for sale" → טרם שולם
  if (winnerIsUser && statusForSale) {
    registeredLabel = "טרם שולם";
  }
  // 2) אם הוגדר "לא נמכר" וגם לא שולם → ביטול זכייה
  else if (statusNotSold && isPaidNo) {
    registeredLabel = "זכיה בוטלה — אי תשלום";
  }
  // 3) טרם התחילה (is_live=0 + For Sale + אין זוכה)
  else if (isLive0 && statusForSale && hasNoWinner) {
    registeredLabel = "המכירה טרם החלה";
  }
  // 4) אתה הזוכה
  else if (winnerIsUser) {
    registeredLabel = "אתה הזוכה במכירה";
  }
  // 5) ברירת מחדל
  else {
    registeredLabel = "המכירה הסתיימה:\nלא זכית";
  }
}


  // טקסט סטטוס המסירה כאשר kind === "won"
  // מכסה שלושת המצבים: לא הוגדר / נשלח / נמסר (או איסוף)
let sentLabel = "שיטת מסירה לא הוגדרה";

if (unpaidWinner) {
  // זוכה שטרם שילם גובר על כל דבר אחר
  sentLabel = "טרם שולם";
} else if (method === "delivery") {
  // אם מוגדר משלוח אבל אין כתובת למשלוח → אין שיטת מסירה מוגדרת בפועל
  if (!hasDeliveryAddress) {
    sentLabel = "שיטת מסירה לא הוגדרה";
  } else {
    sentLabel = isDelivered ? "אושר שההתקבל" : (isSent ? "נשלח" : "טרם נשלח");
  }
} else if (method === "pickup") {
  sentLabel = isDelivered ? "אושר שנאסף" : "טרם נאסף";
}



  // גוון תגית הסטטוס בתחתית הכרטיס (ירוק/ענבר/אפור) לפי סטטוס המסירה
  const deliveryTone = isDelivered ? "toneGreen" : (method ? "toneAmber" : "toneGray");

  return (
    <div className={styles.card} dir="rtl">
      {/* ראש הכרטיס – לחיץ כולו לכניסה לעמוד המוצר; role/tabIndex לשיפור נגישות */}
      <div className={styles.cardHead} onClick={onOpenProduct} role="button" tabIndex={0}>
        {/* תמונה או placeholder */}
        {img ? <img className={styles.cardImg} src={img} alt={name} /> : <div className={styles.noImg}>אין תמונה</div>}

        {/* כותרת + תג סטטוס (תלוי kind) */}
        <div className={styles.cardTitleWrap}>
          <h3 className={styles.cardTitle} title={name}>{name}</h3>
          {kind === "registered"
            ? <Badge tone="toneBlue">{registeredLabel}</Badge>
            : <Badge tone={deliveryTone}>{"סטטוס:\n" + sentLabel}</Badge>}
        </div>
      </div>

      {/* גוף הכרטיס – שדות משתנים לפי kind */}
      <div className={styles.cardBody}>
        {kind === "registered" ? (
          <>
            {/* תאריך זכייה/התחלה – מוצג רק אם יש date תקין */}
            <div className={styles.row}>
              <span className={styles.label}>תאריך זכייה:</span>
              <span>{startDate ? startDate.toLocaleDateString("he-IL") : "-"}</span>
            </div>
            <div className={styles.row}>
              <span className={styles.label}>שעת התחלה:</span>
              <span>{startDate ? startDate.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }) : "-"}</span>
            </div>
          </>
        ) : (
          <>
            {/* מידע רלוונטי ל"זכיתי": מחיר סופי + שיטת מסירה + דירוג (אם קיים) */}
            <div className={styles.row}>
              <span className={styles.label}>מחיר סופי:</span>
              <span>{item?.final_price ? `${item.final_price} ₪` : "-"}</span>
            </div>
            <div className={styles.row}>
              <span className={styles.label}>שיטת מסירה:</span>
              <span>{method === "delivery" ? "משלוח" : method === "pickup" ? "איסוף עצמי" : "לא הוגדר"}</span>
            </div>

            {/* אם המשתמש כבר דירג – מציגים באופן קריא (★/☆) + המספר בסוגריים */}
            {item?.rating != null && (
              <div className={styles.row}>
                <span className={styles.label}>הדירוג שלך:</span>
                <span>
                  {Array.from({ length: 5 }).map((_, i) => (i < Math.round(item.rating) ? "★" : "☆"))}
                  <span style={{ marginInlineStart: 6 }}>({item.rating})</span>
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* תחתית הכרטיס – כפתורי פעולה עקביים */}
      <div className={styles.cardFooter}>
        {/* מעבר מהיר לעמוד המוצר/ההזמנה */}
        <button className={styles.viewButton} type="button" onClick={onOpenProduct}>
          צפייה בפרטי ההזמנה
        </button>

        {/* כפתור "סמן כבוצע" זמין רק במשלוח אחרי שנשלח ועדיין לא סומן כנמסר */}
        {kind === "won" && method === "delivery" && isSent && !isDelivered && (
          <button className={styles.primaryBtn} type="button" onClick={onMarkDelivered} disabled={pending}>
            {pending ? "מעבד..." : "סמן שהתקבל"}
          </button>
        )}

        {/* כפתור "סמן שנאסף" זמין רק באיסוף עצמי אם עדיין לא נאסף */}
        {kind === "won" && method === "pickup" && !isDelivered && (
          <button className={styles.primaryBtn} type="button" onClick={onMarkDelivered} disabled={pending}>
            {pending ? "מעבד..." : "סמן שנאסף"}
          </button>
        )}
      </div>
    </div>
  );
}
