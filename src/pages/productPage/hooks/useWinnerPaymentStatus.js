// src/pages/productPage/hooks/useWinnerPaymentStatus.js
// useWinnerPaymentStatus: הוק שבודק אם הזוכה שילם (isPaid), מחשב אם יש זוכה שלא שילם (isUnpaidWinner), בודק למוכר אם הקונה הספציפי שילם (buyerPaid) ומאתר אם חסרים פרטי משלוח כשנבחר משלוח (sellerSeesMissingAddress) — מבוסס שליפת הצעות (quotations) ושדות is\_paid, ומחזיר גם setIsPaid.

import { useEffect, useState } from "react";
import { getQuotationsByProductId } from "../../../services/quotationApi";

export function useWinnerPaymentStatus({
  product,
  saleInfo,
  isWinnerFinal,
  isWinnerByProduct,
  status,
}) {
  const [isPaid, setIsPaid] = useState(false);
  const [isUnpaidWinner, setIsUnpaidWinner] = useState(false);

  // למוכר: האם הקונה שילם (גם אם עדיין לא מילא כתובת)
  const [buyerPaid, setBuyerPaid] = useState(false);

  // בדיקת תשלום לזוכה (לכל זוכה)
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!product?.product_id || !isWinnerFinal) {
        if (alive) setIsPaid(false);
        return;
      }
      try {
        const listRes = await getQuotationsByProductId(product.product_id);
        const list = listRes?.data || listRes || [];
        const winQuote = list.find(
          (q) => String(q.buyer_id_number) === String(product.winner_id_number)
        );
        const paid =
          !!winQuote &&
          (winQuote.is_paid === true ||
            winQuote.is_paid === 1 ||
            String(winQuote.is_paid).toLowerCase() === "yes" ||
            String(winQuote.is_paid) === "1");
        if (alive) setIsPaid(paid);
      } catch {
        if (alive) setIsPaid(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [product?.product_id, product?.winner_id_number, isWinnerFinal]);

  // חישוב "זוכה שלא שילם"
  useEffect(() => {
    const pendingWithoutSale =
      !saleInfo && isWinnerByProduct && status === "for sale";
    const expiredNotPaid =
      isWinnerByProduct && status === "not sold" && !isPaid;
    const notPaidYet =
      isWinnerFinal && !isPaid && (saleInfo || pendingWithoutSale || expiredNotPaid);
    setIsUnpaidWinner(Boolean(notPaidYet));
  }, [isWinnerFinal, isWinnerByProduct, status, saleInfo, isPaid]);

  // למוכר: בדיקת תשלום של ה־buyer בפועל
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!product?.product_id || !saleInfo?.buyer_id_number) {
          if (alive) setBuyerPaid(false);
          return;
        }
        const listRes = await getQuotationsByProductId(product.product_id);
        const list = listRes?.data || listRes || [];
        const q = list.find(
          (row) =>
            String(row.buyer_id_number) === String(saleInfo.buyer_id_number)
        );
        const paid =
          !!q &&
          (q.is_paid === true ||
            q.is_paid === 1 ||
            String(q.is_paid).toLowerCase() === "yes" ||
            String(q.is_paid) === "1");
        if (alive) setBuyerPaid(paid);
      } catch {
        if (alive) setBuyerPaid(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [product?.product_id, saleInfo?.buyer_id_number]);

  // כתובת חסרה לזוכה (למוכר)
  const sellerSeesMissingAddress =
    !!saleInfo &&
    String(saleInfo?.delivery_method || "").toLowerCase() === "delivery" &&
    ["country", "zip", "street", "house_number", "apartment_number"].some(
      (f) => {
        const v = saleInfo?.[f];
        return v == null || String(v).trim() === "";
      }
    );

  return { isPaid, isUnpaidWinner, setIsPaid, buyerPaid, sellerSeesMissingAddress };
}
