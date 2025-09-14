// ================================
// /src/pages/LiveAuction/components/LivePanel.jsx
// ================================
// קומפוננטת LivePanel: אזור ההצעות המרכזי של המכירה.
// מציגה סטטוס הצעה אחרונה, טיימר סבב (15 שניות), כפתור "הגש הצעה"
// וטיימר כללי לסיום המכירה.
//
// יתרונות העיצוב:
// - הקוד נקי ומופרד מהלוגיקה העסקית (מקבל props בלבד).
// - מבנה ברור ונגיש, כולל aria-labelledby לקישור כותרת-אזור.
// ================================

import styles from "../LiveAuction.module.css";
import TimerBar from "./TimerBar";



//מציג מצב מכירה בזמן שהיא רצה -כולל:הודעה למשתמש על מצב התעות+טיימר סבב+כפתור הגשת הצעה +טיימר כללי של המכירה
export default function LivePanel({
  hasFirstBid,    // bool: האם כבר הוגשה הצעה ראשונה
  isMyLastBid,    // bool: האם המשתמש הנוכחי הוא המציע האחרון
  isBidDisabled,  // bool: האם הכפתור חסום (למשל בזמן המתנה או כשההצעה שלי אחרונה)
  roundTimeLeft,  // number|null: כמה שניות נותרו בסבב 15 השניות
  bidIncrement,   // number: גובה ההצעה המינימלית להוספה
  onBid,          // function: קריאה לפעולה להגשת הצעה
  minutesLeft,    // number|null: דקות שנותרו עד סוף המכירה
  secondsLeft,    // number|null: שניות שנותרו עד סוף המכירה
}) {
  return (
    <section className={styles.centerPanel} aria-labelledby="bidding-area">
      <h2 id="bidding-area" className={styles.sectionTitle}>הצעות</h2>

      {/* טקסט על מצב ההצעות */}
      <p className={styles.lastBidInfo}>
        {!hasFirstBid
          ? "טרם הוגשה הצעה. היה/י הראשון/ה להגיש!"
          : isMyLastBid
          ? "נתת את ההצעה האחרונה!"
          : "ניתנה הצעה ממשתמש! לחץ/י \"הגש הצעה\" כדי לזכות!"}
      </p>

      {/* טיימר 15 שניות — מופעל רק אחרי הצעה ראשונה */}
      {hasFirstBid && roundTimeLeft != null && (
        <>
          <TimerBar value={roundTimeLeft} max={15} />
          <p className={styles.timeText}>
            ⌛ זמן להגשת הצעה: {roundTimeLeft} שניות
          </p>
        </>
      )}

      {/* כפתור הגשת הצעה */}
      <button
        className={
          isBidDisabled
            ? `${styles.bidButton} ${styles.btnDisabled}`
            : styles.bidButton
        }
        disabled={isBidDisabled}
        title={
          isMyLastBid
            ? "הצעת כבר — ממתינים להצעה נגדית"
            : ""
        }
        onClick={onBid}
        data-testid="bid-btn" // מאפשר בדיקות אוטומטיות (React Testing Library)
      >
        {hasFirstBid
          ? isMyLastBid
            ? "ממתינים להצעה נגדית…"
            : `הגש הצעה של +${bidIncrement} ₪`
          : `הגש הצעה ראשונה של +${bidIncrement} ₪`}
      </button>

      {/* טיימר כללי — מוצג רק אם התקבלו ערכים */}
      {minutesLeft != null && secondsLeft != null && (
        <p className={styles.timeRemaining} style={{ marginTop: 10 }}>
          המכירה תסתיים בעוד{" "}
          {String(minutesLeft).padStart(2, "0")}:
          {String(secondsLeft).padStart(2, "0")} דקות
        </p>
      )}
    </section>
  );
}
