// ================================
// /src/pages/LiveAuction/components/PreLivePanel.jsx
// ================================
// קומפוננטת PreLivePanel: מציגה מידע למשתמש כאשר המכירה עוד לא התחילה.
// מציגה את תאריך ההתחלה (טקסטי) ואת הספירה לאחור (אם זמינה),
// יחד עם כפתור הצעה מנוטרל.
//
// יתרונות:
// - מפרידה את מצב "טרום מכירה" מהקומפוננטה הראשית LiveAuction.
// - מספקת חוויית UX ברורה: המשתמש רואה מתי המכירה מתחילה
//   אך לא יכול להגיש הצעות עד שזו נפתחת.
// ================================

import styles from "../LiveAuction.module.css";

//מצב לפני שהמכירה מתחילה -מציג: טקסט המכירה תחל.. +ספירה לאחור+כפתור הצעה מנוטרל
export default function PreLivePanel({ startText, countdown }) {
  return (
    <section className={styles.centerPanel} aria-labelledby="prelive-area">
      <h2 id="prelive-area" className={styles.sectionTitle}>
        מידע לפני התחלה
      </h2>

      {/* טקסט על מועד תחילת המכירה */}
      <p className={styles.currentPrice}>
        המכירה תחל בתאריך {startText}
      </p>

      {/* ספירה לאחור — מוצגת רק אם קיימת */}
      {countdown != null && (
        <p className={styles.countdownToStart}>
          ספירה לאחור: {countdown}
        </p>
      )}

      {/* כפתור חסום עד תחילת המכירה */}
      <button
        className={`${styles.bidButton} ${styles.btnDisabled}`}
        disabled
      >
        ההגשה תיפתח בתחילת המכירה
      </button>
    </section>
  );
}
