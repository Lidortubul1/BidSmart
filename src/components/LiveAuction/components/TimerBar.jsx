// ================================
// /src/pages/LiveAuction/components/TimerBar.jsx
// ================================
// קומפוננטת TimerBar: בר התקדמות ויזואלי שמציג כמה זמן נותר בסבב.
// ברירת מחדל היא מקסימום של 15 שניות.
//
// יתרונות:
// - מופרד מהלוגיקה, מקבל ערכים חיצוניים בלבד (value, max).
// - ניתן לשימוש חוזר בכל מקום שבו נדרש בר זמן/התקדמות.
// ================================

import styles from "../LiveAuction.module.css";


//בר התקדמות קטן שממחיש כמה זמן נשאר בסבב ההצעות(מתוך 15 שניות)
export default function TimerBar({ value = 0, max = 15 }) {
  // מחשב אחוז התקדמות (0–100) באופן בטוח
  const pct = Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <div className={styles.timerWrap}>
      {/* רקע הבר (קבוע) */}
      <div className={styles.timerBar} aria-hidden />

      {/* מילוי הבר בהתאם לאחוז שנשאר */}
      <div
        className={styles.timerFill}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
