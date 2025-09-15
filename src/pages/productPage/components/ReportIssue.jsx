// src/pages/ProductPage/components/ReportIssue.jsx
import React, { useState } from "react";
import styles from "../ProductPage.module.css";
import Contacts from "../../../components/contacts/contacts";

export default function ReportIssue({
  user,
  productId,
  openModal,
  openLoginDirect,   // ← חדש
  goRegister,        // ← חדש
}) {
  const [showForm, setShowForm] = useState(false);
  const [sent, setSent] = useState(false);

  const handleToggle = () => {
    if (sent) return;

    if (!user?.email) {
      if (typeof openModal === "function") {
        openModal({
          title: "התחברות נדרשת",
          message: "בשביל לדווח על מוצר יש להתחבר או להירשם.",
          confirmText: "התחבר",
          extraButtonText: "הרשמה",
          onConfirm: () => openLoginDirect?.(), // פותח טופס התחברות מיד
          onExtra: () => goRegister?.(),       // מעבר לעמוד ההרשמה
        });
      } else {
        // נפילה רכה: אם אין openModal, לפחות לפתוח התחברות
        openLoginDirect?.();
      }
      return;
    }

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
