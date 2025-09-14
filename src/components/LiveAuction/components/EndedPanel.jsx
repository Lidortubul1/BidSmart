// ================================
// /src/pages/LiveAuction/components/EndedPanel.jsx
// ================================
// קומפוננטה להצגת מצב סיום מכירה (Auction Ended).
// תפקידה להציג למשתמש הודעת זכייה עם כפתור תשלום,
// או הודעת הפסד במקרה שלא זכה.

import styles from "../LiveAuction.module.css";

// props:
// - isWinner: boolean → האם המשתמש הנוכחי הוא הזוכה
// - currentPrice: number → המחיר הסופי של המוצר (לא מוצג כרגע, אבל אפשר להוסיף)
// - onPayClick: function → callback שמפעיל את תהליך התשלום (PayPal למשל)


//מצב לאחר סיום המכירה -מציג: אני זוכה הודעת זכייה +כפתור לתשלום/ אם לא זוכה: הודעה פשוטה של המכירה הסתיימה ושלא זכה 
export default function EndedPanel({ isWinner, currentPrice, onPayClick }) {
  return (
    // שימוש ב-<section> עם aria-labelledby → מקל על נגישות לקוראי מסך
    <section className={styles.centerPanel} aria-labelledby="ended-area">
      
      {/* כותרת אזור סיכום */}
      <h2 id="ended-area" className={styles.sectionTitle}>
        סיכום
      </h2>

      {/* תנאי: האם המשתמש זכה או הפסיד */}
      {isWinner ? (
        <>
          {/* הודעת זכייה בולטת עם אמוג'י לחגיגה */}
          <p className={styles.winner}>🎉 זכית במכירה!</p>

          {/* כפתור תשלום – מפעיל את onPayClick שנשלח מהורה */}
          <button
            className={styles.paymentButton}
            onClick={onPayClick}
          >
            עבור לתשלום
          </button>
        </>
      ) : (
        // הודעת הפסד
        <p className={styles.loser}>המכירה הסתיימה. לא זכית.</p>
      )}
    </section>
  );
}
