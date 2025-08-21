// src/pages/ProductPage/components/AdminProductPanel.jsx
import React, { useEffect, useState } from "react";
import { adminFetchProduct, cancelProductSale } from "../../../services/productApi";

export default function AdminProductPanel({ productId }) {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await adminFetchProduct(productId);
        setData(res.product);
        setStatus(res.product.product_status || "");
      } catch {
        setErr("שגיאה בטעינת נתוני המוצר");
      }
    })();
  }, [productId]);

  const isBlocked = String(status || data?.product_status || "")
    .trim()
    .toLowerCase() === "blocked";

  const blockProduct = async () => {
    try {
      setSaving(true);
      setErr("");
      setNotice("");
      await cancelProductSale(productId); // השרת שולח מייל לכל הנרשמים
      setStatus("blocked"); // כדי לעדכן מיידית את ה־UI
      setNotice("הפעולה הושלמה: המוצר נחסם ונשלחו מיילים לנרשמים.");
      setTimeout(() => setNotice(""), 3500);
    } catch {
      setErr("שגיאה בעת חסימת המוצר");
    } finally {
      setSaving(false);
    }
  };

  if (!data) return null;

  const seller = {
    id: data.seller_id_number || data.seller_id,
    name: `${data.seller_first_name || ""} ${data.seller_last_name || ""}`.trim(),
    email: data.seller_email || "",
    phone: data.seller_phone || "",
    status: data.seller_status || "",
  };

  return (
    <div style={{ border: "1px solid #eee", padding: 16, borderRadius: 12, marginBottom: 16, direction: "rtl" }}>
      <h3 style={{ marginTop: 0 }}>פאנל ניהול מוצר</h3>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <strong>נתוני מוצר</strong>
          <div>שם מוצר: {data.product_name}</div>
          <div>סטטוס: <code>{status || "—"}</code></div>
          <div>מחיר פתיחה: ₪{data.price}</div>
          {data.created_at && (
            <div>נוצר ב: {new Date(data.created_at).toLocaleString("he-IL")}</div>
          )}
          {data.start_date && (
            <div>תאריך התחלה: {new Date(data.start_date).toLocaleString("he-IL")}</div>
          )}
        </div>

        <div>
          <strong>נתוני מוכר</strong>
          <div>#{seller.id} · {seller.name || "ללא שם"}</div>
          <div>{seller.email || "—"}</div>
          <div>{seller.phone || "—"}</div>
          <div>סטטוס: {seller.status || "—"}</div>
        </div>
      </div>

      {/* אזור הפעולות */}
      <div style={{ marginTop: 12 }}>
        {isBlocked ? (
          <div style={{ padding: "10px 12px", background: "#fff8e1", border: "1px solid #ffe082", borderRadius: 8 }}>
            המוצר נחסם ולא נמצא במערכת יותר.
          </div>
        ) : (
          <button
            style={{ backgroundColor: "#000", color: "#fff", padding: "8px 14px", borderRadius: 30 }}
            disabled={saving}
            onClick={blockProduct}
          >
            חסימת מוצר (מייל לכל הנרשמים)
          </button>
        )}
      </div>

      {notice && <div style={{ color: "green", marginTop: 8 }}>{notice}</div>}
      {err && <div style={{ color: "crimson", marginTop: 8 }}>{err}</div>}
    </div>
  );
}
