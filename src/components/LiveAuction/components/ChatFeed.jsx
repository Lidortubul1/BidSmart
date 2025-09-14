// /src/pages/LiveAuction/components/ChatFeed.jsx
// קומפוננטה להצגת לוג ההצעות (Real-time Bids Feed) בצד ימין של ממשק ה־LiveAuction.
// אחראית אך ורק על תצוגת ההודעות (Stateless Presentation Component).

import styles from "../LiveAuction.module.css";

// ChatFeed מקבלת chatLog כ־prop (מערך של אובייקטים עם text + color)
// chatLog מתעדכן בקומפוננטת האב (LiveAuction) כאשר מתקבלות הצעות חדשות דרך Socket.IO


//מציג את הצד ימין של מסך- מציג בזמן אמת מי הציע וכמה 
export default function ChatFeed({ chatLog = [] }) {
  return (
    // שימוש ב־<aside> כדי להגדיר תוכן צדדי עם משמעות סמנטית (נגישות טובה יותר)
    <aside className={styles.chatPanel} aria-labelledby="live-feed">
      
      {/* כותרת אזור ההצעות בזמן אמת */}
      <h2 id="live-feed" className={styles.sectionTitle}>
        הצעות בזמן אמת
      </h2>

      {/* 
        מכולה להצגת הודעות הצ'אט:
        - tabIndex=0 → מאפשר ניווט מקלדת (focus)
        - role="log" + aria-live="polite" → נגישות: קוראי מסך יקראו הודעות חדשות
        - aria-relevant="additions text" → ישמיעו רק הוספות חדשות, לא את כל הרשימה מחדש
      */}
      <div
        className={styles.chatLog}
        tabIndex={0}
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
      >
        {/* מיפוי כל הודעה במערך להצגה עם צבע ייחודי למשתמש */}
        {chatLog.map((msg, i) => (
          <p key={i} style={{ color: msg.color }} className={styles.chatRow}>
            {msg.text}
          </p>
        ))}
      </div>
    </aside>
  );
}
