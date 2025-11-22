// ================================
// /src/pages/LiveAuction/components/HeaderBar.jsx
// ================================
// קומפוננטת HeaderBar: מציגה את שם המוצר, תג מצב (Live/נגמר/טרם התחיל),
// ומידע מטא נוסף כמו מחיר נוכחי ושעון ספירה לאחור.
//
// הקומפוננטה מופרדת כדי להבטיח SRP (Single Responsibility Principle):
// היא מטפלת אך ורק בהצגת "בר עליון" של מצב המכרז.
//
// יתרונות:
// - נגישות משופרת (aria-live, aria-atomic).
// - גמישות: ניתן לשלב בקלות בכל פריסת עמוד.
// ================================

import styles from "../LiveAuction.module.css";


//מציג את השורה העליונה של המכירה- שם המוצר+תג מצב+מחיר נוכחי+טיימר כללי
export default function HeaderBar({
  productName,   // string: שם המוצר
  isLive,        // boolean: האם המכרז בלייב
  auctionEnded,  // boolean: האם המכרז הסתיים
  currentPrice,  // number: מחיר נוכחי להצגה
  minutesLeft,   // number|null: דקות שנותרו
  secondsLeft,   // number|null: שניות שנותרו
}) {
  // פונקציה פנימית לבניית תג מצב (Badge)
  const renderStatusBadge = () => {
    if (auctionEnded)
      return (
        <span className={`${styles.badge} ${styles.badgeEnded}`}>
          הסתיימה
        </span>
      );
    if (isLive)
      return (
        <span
          className={`${styles.badge} ${styles.badgeLive}`}
          aria-live="polite" // מודיע לקורא מסך שהתוכן משתנה דינאמית
        >
          LIVE עכשיו
        </span>
      );
    return (
      <span className={`${styles.badge} ${styles.badgeSoon}`}>
        טרם התחילה
      </span>
    );
  };

  return (
    <div className={styles.headerRow}>
      {/* בלוק כותרת עם שם מוצר + תג מצב */}
      <div className={styles.titleBlock}>
        <h1 className={styles.title} title={productName}>
          {productName}
        </h1>
        {renderStatusBadge()}
      </div>

      {/* בלוק מידע נוסף: מחיר נוכחי + זמן שנותר */}
      <div className={styles.metaBlock}>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>מחיר נוכחי</span>
          <span className={styles.metaValue}>₪{currentPrice}</span>
        </div>

        {/* טיימר מוצג רק אם מועברים ערכים תקינים */}
        {isLive && minutesLeft != null && secondsLeft != null && (
          <div
            className={styles.metaItem}
            aria-live="polite" // עדכון רציף של הזמן בזמן אמת
            aria-atomic        // מבטיח שהטקסט ייקרא כיחידה אחת
          >
            <span className={styles.metaLabel}>זמן שנותר</span>
            <span className={styles.metaValue}>
              {String(minutesLeft).padStart(2, "0")}:
              {String(secondsLeft).padStart(2, "0")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
