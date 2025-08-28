// src/pages/ProductPage/components/AdminProductPanel.jsx
import React, { useEffect, useState } from "react";
import { adminFetchProduct } from "../../../services/productApi";
import {  adminFetchUserByIdNumber } from "../../../services/userApi";
import TicketCard from "../../../components/tickets/TicketCard";

export default function AdminProductPanel({ productId }) {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("");
  const [err, setErr] = useState("");
  const [winner, setWinner] = useState(null);     // ← חדש
  const [loadingWinner, setLoadingWinner] = useState(false); // ← אופציונלי

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await adminFetchProduct(productId);
        if (!alive) return;
        setData(res.product);
        setStatus(res.product.product_status || "");

        // נטען פרטי מנצח אם יש winner_id_number
        const wid = res.product?.winner_id_number;
        if (wid) {
          setLoadingWinner(true);
          try {
            const u = await adminFetchUserByIdNumber(wid);
            if (!alive) return;
            setWinner(u); // { id_number, first_name, last_name, email }
          } catch {}
          finally { if (alive) setLoadingWinner(false); }
        } else {
          setWinner(null);
        }
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
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
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

        <div>
          <strong>נתוני מנצח</strong>
          {data.winner_id_number ? (
            loadingWinner ? (
              <div>טוען נתוני מנצח…</div>
            ) : winner ? (
              <>
                <div>#{winner.id_number}</div>
                <div>{`${winner.first_name || ""} ${winner.last_name || ""}`.trim() || "—"}</div>
                <div>{winner.email || "—"}</div>
              </>
            ) : (
              <div>לא נמצאו פרטי מנצח</div>
            )
          ) : (
            <div>אין זוכה למוצר זה</div>
          )}
        </div>
      </div>

      {/* כרטיס שיחות/דיווחים */}
      <div style={{ marginTop: 16 }}>
        <TicketCard productId={productId} />
      </div>

      {err && <div style={{ color: "crimson", marginTop: 8 }}>{err}</div>}
    </div>
  );
}
