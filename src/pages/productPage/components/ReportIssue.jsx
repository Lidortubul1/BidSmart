// src/pages/ProductPage/components/ReportIssue.jsx
// דיווח על מוצר: כפתור “נתקלת בבעיה?” (דורש התחברות) שפותח טופס Contacts במצב report (קומפקטי, עם שדות משתמש לקריאה בלבד); לאחר שליחה נסגר ומוצגת הודעת תודה, נמנעת שליחה חוזרת.

import React, { useState } from "react";
import styles from "../ProductPage.module.css";
import Contacts from "../../../components/contacts/contacts";
//דיווח על מוצר
export default function ReportIssue({ user, productId, onNeedLogin }) {
  const [showForm, setShowForm] = useState(false);
  const [sent, setSent] = useState(false);

  const handleToggle = () => {
    if (sent) return;
    if (!user?.email) return onNeedLogin?.();
    setShowForm((v) => !v);
  };

  return (
    <div className={styles.infoNote} style={{ marginTop: 16 }}>
      {sent ? (
        <div className={styles.success}>הודעה נשלחה להנהלה — תודה רבה על הדיווח! 🙏</div>
      ) : (
        <>
          <button type="button" className={styles.linkLikeButton} onClick={handleToggle}>
            נתקלת בבעיה במוצר?
          </button>
          {showForm && (
            <div style={{ marginTop: 12 }}>
              <Contacts
                variant="compact"
                mode="report"
                productId={productId}
                title="דיווח על מוצר זה"
                readOnlyUserFields
                onDone={() => { setShowForm(false); setSent(true); }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
