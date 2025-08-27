// src/pages/ProductPage/hooks/useSaleState.js
import { useEffect, useState } from "react";
import { getAllSales } from "../../../services/saleApi";


// הוק שמחזיר את רשומת המכירה למוצר (אם קיימת) ובודק האם המשתמש הנוכחי הוא הזוכה; מחזיר { saleInfo, saleForProduct, isWinner }
export function useSaleState(productId, userIdNumber) {
  const [sale, setSale] = useState(null);
  const [isWinner, setIsWinner] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!productId) return;
      const res  = await getAllSales(); // עדיף API ייעודי: getSaleByProductId(productId)
      const list = res?.data || res || [];
      const prodSale = list.find(s => String(s.product_id) === String(productId));
      if (!alive) return;
      setSale(prodSale || null);
      setIsWinner(!!(prodSale && userIdNumber &&
                     String(prodSale.buyer_id_number) === String(userIdNumber)));
    })().catch(() => { if (alive){ setSale(null); setIsWinner(false);} });
    return () => { alive = false; };
  }, [productId, userIdNumber]);

  return { saleInfo: sale, saleForProduct: sale, isWinner }; // שמירה על שמות קיימים
}
