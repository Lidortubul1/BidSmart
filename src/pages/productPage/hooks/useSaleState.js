// src/pages/ProductPage/hooks/useSaleState.js
import { useEffect, useState } from "react";
import { getAllSales } from "../../../services/saleApi"

export function useSaleState(productId, userIdNumber) {
  const [saleForProduct, setSaleForProduct] = useState(null);
  const [saleInfo, setSaleInfo] = useState(null);
  const [isWinner, setIsWinner] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!productId) return;
        const res = await getAllSales();
        const list = res?.data || res || [];
        const prodSale = list.find((s) => String(s.product_id) === String(productId));
        if (!alive) return;

        setSaleForProduct(prodSale || null);
        const winner = !!(prodSale && userIdNumber && String(prodSale.buyer_id_number) === String(userIdNumber));
        setIsWinner(winner);
        setSaleInfo(winner ? prodSale : null);
      } catch {
        if (alive) {
          setSaleForProduct(null);
          setSaleInfo(null);
          setIsWinner(false);
        }
      }
    })();
    return () => { alive = false; };
  }, [productId, userIdNumber]);

  return { saleForProduct, saleInfo, isWinner };
}
