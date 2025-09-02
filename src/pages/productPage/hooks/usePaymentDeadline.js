// src/pages/ProductPage/hooks/usePaymentDeadline.js
import { useEffect, useRef, useState } from "react";
import { expireUnpaidProduct } from "../../../services/productApi";
import { formatDateTimeHe } from "../utils/datetime";

// הוק שמחשב דדליין לתשלום (24 שעות מהצעת הזוכה), מחזיר secondsLeft ו־deadlineText ומבצע expire כשנגמר הזמן
export function usePaymentDeadline(lastBidIso, enabled, productId, onExpired) {
  const [secondsLeft, setLeft] = useState(null); // שניות שנותרו לספירה לאחור

  const lastBidMs = lastBidIso ? new Date(lastBidIso).getTime() : NaN; // המרת תאריך ההצעה האחרונה למילישניות
  const deadlineMs = Number.isFinite(lastBidMs) ? lastBidMs + 24 * 60 * 60 * 1000 : null; // חישוב דדליין: 24 שעות קדימה

  const deadlineText = deadlineMs ? formatDateTimeHe(new Date(deadlineMs).toISOString()) : ""; // טקסט תצוגה של מועד אחרון בעברית

  const firedRef = useRef(false); // דגל למניעת טריגר כפול של expire
  useEffect(() => { firedRef.current = false; }, [productId, deadlineMs, enabled]); // איפוס הדגל כשאחד הפרמטרים משתנה

  useEffect(() => { // טיימר שמעדכן את השניות שנותרו כל שנייה
    if (!enabled || !deadlineMs) { setLeft(null); return; }
    const tick = () => setLeft(Math.max(Math.floor((deadlineMs - Date.now()) / 1000), 0));
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [enabled, deadlineMs]);

  useEffect(() => { // כשנגמר הזמן מפעיל expire בשרת ומרענן נתונים חיצוניים
    if (!enabled || secondsLeft !== 0 || !productId || firedRef.current) return;
    firedRef.current = true;
    (async () => {
      try {
        await expireUnpaidProduct(productId);
        onExpired?.();
      } catch {
        // אפשר לאפשר ניסיון חוזר ע"י איפוס firedRef.current=false לפי צורך
      }
    })();
  }, [enabled, secondsLeft, productId, onExpired]);

  return { secondsLeft, deadlineText }; // מחזיר את השניות שנותרו ואת טקסט הדדליין
}
