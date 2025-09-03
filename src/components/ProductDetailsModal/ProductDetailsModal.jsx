import { useState } from "react";
import { createPortal } from "react-dom";
import styles from "./ProductDetailsModal.module.css";
import { markProductAsSent } from "../../services/saleApi";
import CustomModal from "../CustomModal/CustomModal";

export default function ProductDetailsModal({ product, onClose }) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleSendClick = async () => {
    await markProductAsSent(product.product_id);
    setShowConfirmModal(true);
  };

  // ▼ נורמליזציה: גם רווחים וגם קווים תחתונים ייחשבו כרווח
  const raw = String(product.status || product.product_status || "")
    .trim()
    .toLowerCase();
  const normStatus = raw.replace(/[_\s]+/g, " "); // למשל "for_sale" → "for sale"

  // ▼ מפה ידידותית לתצוגה
  let statusText = "לא ידוע";
  let statusTone = "toneGray";
  let statusIcon = "info";

  if (normStatus === "sale") {
    statusText = "נמכר";
    statusTone = "toneGreen";
    statusIcon = "check";
  } else if (normStatus === "for sale") {
    statusText = "זמין למכירה";
    statusTone = "toneBlue";
    statusIcon = "tag";
  } else if (normStatus === "not sold") {
    statusText = "לא נמכר";
    statusTone = "toneGray";
    statusIcon = "info";
  } else if (normStatus === "blocked") {
    statusText = "מוצר נחסם";
    statusTone = "toneRed";
    statusIcon = "ban";
  } else if (normStatus === "admin blocked") {
    statusText = "מוצר נחסם על ידי ההנהלה";
    statusTone = "toneRed";
    statusIcon = "ban";
  }

  const deliveryMethod = (product.delivery_method || "").toLowerCase();

  return createPortal(
    <>
      <div className={styles.overlay}>
        <div className={styles.modal}>
          <h2>פרטי מוצר</h2>

          <p><strong>שם:</strong> {product.product_name}</p>
          <p><strong>מחיר:</strong> {product.current_price} ₪</p>

          {/* ▼ להציג את הסטטוס המתורגם, לא את rawStatus */}
          <p>
            <strong>סטטוס:</strong> {statusText}
          </p>

          {/* ▼ להשתמש ב-normStatus כדי לוודא שלא תיפלי על אותיות/קווים תחתונים */}
          {normStatus === "sale" && (
            <>
              {deliveryMethod === "delivery" ? (
                <>
                  <h3>פרטי משלוח</h3>
                  <p><strong>עיר:</strong> {product.city}</p>
                  <p>
                    <strong>רחוב:</strong> {product.street} {product.house_number}
                    {product.apartment_number ? `, דירה ${product.apartment_number}` : ""}
                  </p>
                  <p><strong>מיקוד:</strong> {product.zip}</p>
                  <p><strong>הערות מהקונה:</strong> {product.notes || "אין הערות"}</p>

                  {(product.sent || "").toString().toLowerCase() === "yes" ? (
                    <p style={{ color: "green", marginTop: 10, fontWeight: "bold" }}>
                      המוצר נשלח ללקוח.
                    </p>
                  ) : (
                    <button className={styles.sendButton} onClick={handleSendClick}>
                      סימון שהמוצר נשלח ללקוח
                    </button>
                  )}
                </>
              ) : (
                <>
                  <p style={{ color: "gray", marginTop: 10 }}>
                    הרוכש בחר באיסוף עצמי.
                  </p>

                  {(product.sent || "").toString().toLowerCase() === "yes" ? (
                    <p style={{ color: "green", marginTop: 10, fontWeight: "bold" }}>
                      המוצר נמסר ללקוח.
                    </p>
                  ) : (
                    <button className={styles.sendButton} onClick={handleSendClick}>
                      סימון שהמוצר נמסר ללקוח
                    </button>
                  )}
                </>
              )}
            </>
          )}

          <button className={styles.closeButton} onClick={onClose}>
            סגור
          </button>
        </div>
      </div>

      {showConfirmModal && (
        <CustomModal
          title="עודכן בהצלחה"
          message="המוצר סומן כנשלח / נמסר בהצלחה."
          confirmText="סגור"
          onConfirm={() => {
            setShowConfirmModal(false);
            onClose();
            window.location.reload();
          }}
        />
      )}
    </>,
    document.body
  );
}
