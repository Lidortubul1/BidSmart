import { createPortal } from "react-dom";
import styles from "./ProductDetailsModal.module.css";
import { markProductAsSent } from "../../services/saleApi";

export default function ProductDetailsModal({ product, onClose }) {
  const handleSendClick = async () => {
    await markProductAsSent(product.product_id);
    alert("סימנת את המוצר כנשלח / נמסר");
    onClose();
    window.location.reload();
  };

  const deliveryMethod = product.delivery_method?.toLowerCase();

  return createPortal(
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2>פרטי מוצר</h2>
        <p>
          <strong>שם:</strong> {product.product_name}
        </p>
        <p>
          <strong>מחיר נוכחי:</strong> {product.current_price} ₪
        </p>
        <p>
          <strong>סטטוס:</strong> {product.status}
        </p>

        {product.product_status === "sale" && (
          <>
            {deliveryMethod === "delivery" ? (
              <>
                <h3>פרטי משלוח</h3>
                <p>
                  <strong>עיר:</strong> {product.city}
                </p>
                <p>
                  <strong>רחוב:</strong> {product.street} {product.house_number}
                  , דירה {product.apartment_number}
                </p>
                <p>
                  <strong>מיקוד:</strong> {product.zip}
                </p>
                <p>
                  <strong>הערות מהקונה:</strong> {product.notes || "אין הערות"}
                </p>

                {product.sent === "yes" && (
                  <p
                    style={{
                      color: "green",
                      marginTop: "10px",
                      fontWeight: "bold",
                    }}
                  >
                    המוצר נשלח ללקוח.
                  </p>
                )}

                {product.sent !== "yes" && (
                  <button
                    className={styles.sendButton}
                    onClick={handleSendClick}
                  >
                    סימון שהמוצר נשלח ללקוח
                  </button>
                )}
              </>
            ) : (
              <>
                <p style={{ color: "gray", marginTop: "10px" }}>
                  הרוכש בחר באיסוף עצמי.
                </p>

                {product.sent === "yes" && (
                  <p
                    style={{
                      color: "green",
                      marginTop: "10px",
                      fontWeight: "bold",
                    }}
                  >
                    המוצר נמסר ללקוח.
                  </p>
                )}

                {product.sent !== "yes" && (
                  <button
                    className={styles.sendButton}
                    onClick={handleSendClick}
                  >
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
    </div>,
    document.body
  );
}
