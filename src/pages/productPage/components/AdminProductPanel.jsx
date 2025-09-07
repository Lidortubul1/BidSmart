// src/pages/ProductPage/components/AdminProductPanel.jsx
// פאנל ניהול מוצר (אדמין): טוען נתוני מוצר וסטטוס (adminFetchProduct) כולל ספירת נרשמים (getRegistrationsCount), מציג כפתורי פתיחה/סגירה לפרטי המוכר והזוכה עם מיפוי ת״ז→users.id (adminFetchUserByIdNumber) והטמעת AdminUserDetails, ומציג שרשור דיווחים/פניות למוצר (TicketCard); כולל דגלי טעינה/שגיאות וניקוי מצבים בעת החלפת מוצר.

import React, { useEffect, useState } from "react";
import { adminFetchProduct } from "../../../services/productApi";
import { adminFetchUserByIdNumber } from "../../../services/userApi";
import TicketCard from "../../../components/tickets/TicketCard";
import AdminUserDetails from "../../AdminUsers/AdminUserDetails";
import styles from "../ProductPage.module.css";
import { getRegistrationsCount } from "../../../services/quotationApi"; // כבר ייבאת

export default function AdminProductPanel({ productId }) {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("");
  const [err, setErr] = useState("");

  // ספירת נרשמים
  const [regCount, setRegCount] = useState(null); // null=טוען, מספר=תוצאה
  const [regErr, setRegErr] = useState("");

  // פתיחה/סגירה של הכרטיסים
  const [openSeller, setOpenSeller] = useState(false);
  const [openWinner, setOpenWinner] = useState(false);

  // userId פנימי להצגה ב-AdminUserDetails
  const [sellerUserId, setSellerUserId] = useState(null);
  const [winnerUserId, setWinnerUserId] = useState(null);

  // דגלי טעינה/שגיאה למיפוי id_number ➜ id
  const [loadingSellerId, setLoadingSellerId] = useState(false);
  const [loadingWinnerId, setLoadingWinnerId] = useState(false);
  const [sellerIdErr, setSellerIdErr] = useState("");
  const [winnerIdErr, setWinnerIdErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await adminFetchProduct(productId);
        if (!alive) return;
        setData(res.product);
        setStatus(res.product.product_status || "");

        // איפוס כשמחליפים מוצר
        setOpenSeller(false);
        setOpenWinner(false);
        setSellerUserId(null);
        setWinnerUserId(null);
        setSellerIdErr("");
        setWinnerIdErr("");

        //  טען ספירת נרשמים
        setRegErr("");
        setRegCount(null);
        try {
          const c = await getRegistrationsCount(productId);
          if (alive) setRegCount(c);
        } catch {
          if (alive) {
            setRegErr("שגיאה בשליפת כמות נרשמים");
            setRegCount(0);
          }
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
    id_number: data.seller_id_number || null,
    name: `${data.seller_first_name || ""} ${data.seller_last_name || ""}`.trim(),
    email: data.seller_email || "",
    phone: data.seller_phone || "",
    status: data.seller_status || "",
  };

  // מיפוי חד-פעמי id_number ➜ users.id (ל-AdminUserDetails)
  async function mapIdNumberToUserId(idNumber, setUserId, setErr, setLoading) {
    if (!idNumber) return;
    if (setUserId === setSellerUserId && sellerUserId) return;
    if (setUserId === setWinnerUserId && winnerUserId) return;

    setErr("");
    setLoading(true);
    try {
      const u = await adminFetchUserByIdNumber(idNumber);
      const internalId = u?.id || null;
      if (!internalId) setErr("לא אותר מזהה פנימי (users.id) למשתמש הזה.");
      else setUserId(internalId);
    } catch {
      setErr("שגיאה בשליפת מזהה פנימי למשתמש.");
    } finally {
      setLoading(false);
    }
  }

  async function onToggleSeller() {
    const next = !openSeller;
    setOpenSeller(next);
    if (next && seller.id_number && !sellerUserId && !loadingSellerId) {
      await mapIdNumberToUserId(seller.id_number, setSellerUserId, setSellerIdErr, setLoadingSellerId);
    }
  }

  async function onToggleWinner() {
    const next = !openWinner;
    setOpenWinner(next);
    if (next && data.winner_id_number && !winnerUserId && !loadingWinnerId) {
      await mapIdNumberToUserId(data.winner_id_number, setWinnerUserId, setWinnerIdErr, setLoadingWinnerId);
    }
  }

  return (
    <div className={styles.adminPanel}>
      <h3 className={styles.adminPanelTitle}>פאנל ניהול מוצר</h3>

      <div className={styles.adminGrid}>
        {/* נתוני מוצר */}
        <div>
          <strong>נתוני מוצר</strong>
          <div>שם מוצר: {data.product_name}</div>
          <div>סטטוס: <code>{status || "—"}</code></div>
          <div>מחיר פתיחה: ₪{data.price}</div>
          {data.created_at && <div>נוצר ב: {new Date(data.created_at).toLocaleString("he-IL")}</div>}
          {data.start_date && <div>תאריך התחלה: {new Date(data.start_date).toLocaleString("he-IL")}</div>}

          {/*  כמות נרשמים */}
          <div style={{ marginTop: 6 }}>
            כמות נרשמים:{" "}
            <strong>
              {regCount === null ? "טוען…" : regCount}
            </strong>
            {regErr && <span className={styles.errorText} style={{ marginRight: 8 }}>{regErr}</span>}
          </div>
        </div>

        {/* נתוני מוכר + כפתור בלבד */}
        <div className={`${styles.userRow} ${styles.adminItemFull}`}>
          <strong>נתוני מוכר</strong>
          {seller.id_number ? (
            <>
              <button
                type="button"
                onClick={onToggleSeller}
                className={styles.smallBtn}
                title="הצג/הסתר פרטי מוכר"
              >
                {loadingSellerId ? "טוען…" : openSeller ? "סגור פרטי מוכר" : "פתח פרטי מוכר"}
              </button>

              {openSeller && (
                <div className={styles.userDetailsBox}>
                  {sellerIdErr && <div className={styles.errorText}>{sellerIdErr}</div>}
                  {!sellerIdErr && sellerUserId && <AdminUserDetails userId={sellerUserId} />}
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* נתוני מנצח + כפתור בלבד */}
        <div className={`${styles.userRow} ${styles.adminItemFull}`}>
          <strong>נתוני מנצח</strong>
          {data.winner_id_number ? (
            <>
              <button
                type="button"
                onClick={onToggleWinner}
                className={styles.smallBtn}
                title="הצג/הסתר פרטי מנצח"
              >
                {loadingWinnerId ? "טוען…" : openWinner ? "סגור פרטי מנצח" : "פתח פרטי מנצח"}
              </button>

              {openWinner && (
                <div className={styles.userDetailsBox}>
                  {winnerIdErr && <div className={styles.errorText}>{winnerIdErr}</div>}
                  {!winnerIdErr && winnerUserId && <AdminUserDetails userId={winnerUserId} />}
                </div>
              )}
            </>
          ) : (
            <div>אין זוכה למוצר זה</div>
          )}
        </div>
      </div>

      <div className={styles.ticketsBox}>
        <TicketCard productId={productId} />
      </div>

      {err && <div className={styles.errorText}>{err}</div>}
    </div>
  );
}
