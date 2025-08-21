// src/pages/ProductPage/hooks/usePaymentDeadline.js
import { useEffect, useState } from "react";
import { expireUnpaidProduct } from "../../../services/productApi"
import { formatDateTimeHe } from "../utils/datetime"

export function usePaymentDeadline(lastBidIso, enabled, productId, onExpired) {
  const [secondsLeft, setLeft] = useState(null);
  const deadlineMs = lastBidIso ? new Date(lastBidIso).getTime() + 24 * 60 * 60 * 1000 : null;
  const deadlineText = deadlineMs ? formatDateTimeHe(new Date(deadlineMs).toISOString()) : "";

  useEffect(() => {
    if (!enabled || !deadlineMs) { setLeft(null); return; }

    const tick = () => setLeft(Math.max(Math.floor((deadlineMs - Date.now()) / 1000), 0));
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [enabled, deadlineMs]);

  // כשנגמר הזמן – סגירת המכרז 
  useEffect(() => {
    if (!enabled || secondsLeft !== 0 || !productId) return;
    (async () => {
      try {
        await expireUnpaidProduct(productId);
        onExpired?.(); // לדוגמה: ריענון מוצר
      } catch {}
    })();
  }, [enabled, secondsLeft, productId, onExpired]);

  return { secondsLeft, deadlineText };
}
