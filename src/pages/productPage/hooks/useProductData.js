// src/pages/ProductPage/hooks/useProductData.js
import { useEffect, useState } from "react";
import { getProductById } from "../../../services/productApi";

// הוק שמביא ומנהל את נתוני המוצר לפי productId ומחזיר { product, setProduct, error }
export function useProductData(productId) {
  const [product, setProduct] = useState(null);
  const [error, setErr] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await getProductById(productId);
        if (alive) setProduct(data);
      } catch (e) {
        if (alive) setErr(e);
      }
    })();
    return () => { alive = false; };
  }, [productId]);

  return { product, setProduct, error };
}
