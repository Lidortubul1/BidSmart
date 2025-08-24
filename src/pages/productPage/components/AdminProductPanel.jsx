// src/pages/ProductPage/components/AdminProductPanel.jsx
//בתוך הדף מוצר - צפייה של מנהל רק 
import React, { useEffect, useState } from "react";
import { adminFetchProduct } from "../../../services/productApi";
import TicketCard from "../../../components/tickets/TicketCard"; // ⬅️ משתמשים בכרטיס המאוחד

export default function AdminProductPanel({ productId }) {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await adminFetchProduct(productId);
        if (!alive) return;
        setData(res.product);
        setStatus(res.product.product_status || "");
      } catch {
        if (!alive) return;
        setErr("שגיאה בטעינת נתוני המוצר");
      }
    })();
    return () => { alive = false; };
  }, [productId]);

  if (!data) return null;

  const seller = {
    id: data.seller_id_number || data.seller_id,
    name: `${data.seller_first_name || ""} ${data.seller_last_name || ""}`.trim(),
    email: data.seller_email || "",
    phone: data.seller_phone || "",
    status: data.seller_status || "",
  };

  return (
    <div style={{ border: "1px solid #e7ebf0", padding: 16, borderRadius: 12, marginBottom: 16, direction: "rtl", background: "#fff" }}>
      <h3 style={{ marginTop: 0 }}>פאנל ניהול מוצר</h3>

      {/* מידע כללי */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <strong>נתוני מוצר</strong>
          <div>שם מוצר: {data.product_name}</div>
          <div>סטטוס: <code>{status || "—"}</code></div>
          <div>מחיר פתיחה: ₪{data.price}</div>
          {data.created_at && <div>נוצר ב: {new Date(data.created_at).toLocaleString("he-IL")}</div>}
          {data.start_date && <div>תאריך התחלה: {new Date(data.start_date).toLocaleString("he-IL")}</div>}
        </div>

        <div>
          <strong>נתוני מוכר</strong>
          <div>#{seller.id} · {seller.name || "ללא שם"}</div>
          <div>{seller.email || "—"}</div>
          <div>{seller.phone || "—"}</div>
          <div>סטטוס: {seller.status || "—"}</div>
        </div>
      </div>

      {/* כרטיס השיחה/דיווחים + סטטוס מקובץ + חסימת מוצר – הכל מתוך TicketCard */}
      <div style={{ marginTop: 16 }}>
        <TicketCard productId={productId} />
      </div>

      {err && <div style={{ color: "crimson", marginTop: 8 }}>{err}</div>}
    </div>
  );
}
