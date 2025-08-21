// src/pages/ProductPage/components/OrderDetails.jsx
import React from "react";
import styles from "../ProductPage.module.css"
import { formatDateTimeHe } from "../utils/datetime"

export default function OrderDetails({ sale }) {
  if (!sale) return null;
  const method = String(sale.delivery_method || "").toLowerCase();
  const shipped = sale.sent === "yes";
  const delivered = sale.is_delivered === 1 || sale.is_delivered === "1";
  const winDateText = sale.end_date ? formatDateTimeHe(sale.end_date) : "-";
  const methodText = method === "pickup" ? "איסוף עצמי" : "משלוח";
  const statusText =
    method === "pickup"
      ? (delivered ? "✅ המוצר נאסף" : "⌛ ממתין לאיסוף")
      : (delivered ? "✅ נמסר" : shipped ? "📦  המוצר נשלח אלייך" : "⌛ ממתין לשליחת המוכר");

  return (
    <div className={styles.orderCard}>
      <h3 className={styles.orderTitle}>פרטי ההזמנה שלך</h3>
      <div className={styles.orderRow}><span className={styles.orderLabel}>תאריך זכייה:</span><span>{winDateText}</span></div>
      <div className={styles.orderRow}><span className={styles.orderLabel}>מחיר סופי:</span><span>{sale.final_price ? `${sale.final_price} ₪` : "-"}</span></div>
      <div className={styles.orderRow}><span className={styles.orderLabel}>שיטת מסירה:</span><span>{methodText}</span></div>

      {method === "delivery" && (
        <>
          <div className={styles.orderRow}><span className={styles.orderLabel}>עיר:</span><span>{sale.city || "-"}</span></div>
          <div className={styles.orderRow}><span className={styles.orderLabel}>רחוב:</span><span>{sale.street || "-"}</span></div>
          <div className={styles.orderRow}><span className={styles.orderLabel}>מס' בית / דירה:</span>
            <span>{(sale.house_number || "-")}/{sale.apartment_number ?? "-"}</span></div>
          <div className={styles.orderRow}><span className={styles.orderLabel}>מיקוד:</span><span>{sale.zip || "-"}</span></div>
          <div className={styles.orderRow}><span className={styles.orderLabel}>מדינה:</span><span>{sale.country || "-"}</span></div>
        </>
      )}

      <div className={styles.orderRow}><span className={styles.orderLabel}>טלפון ליצירת קשר:</span><span>{sale.phone || "-"}</span></div>
      <div className={styles.orderRow}><span className={styles.orderLabel}>הערות:</span><span>{sale.notes || "-"}</span></div>
      <div className={styles.orderRow}><span className={`${styles.badge} ${delivered ? styles.toneGreen : styles.toneAmber}`}>סטטוס: {statusText}</span></div>
    </div>
  );
}
