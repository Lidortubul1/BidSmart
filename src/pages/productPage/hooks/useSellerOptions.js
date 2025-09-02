// src/pages/ProductPage/hooks/useSellerOptions.js
import { useEffect, useState } from "react";
import { getSellerDeliveryOptions } from "../../../services/productApi"




//מחזיר את אפשרויות המשלוח של המוכר
export default function useSellerOptions(productId) {
  const [loading, setLoading] = useState(true);
  const [option, setOption] = useState("delivery");
  const [pickupAddressText, setPickupText] = useState("");
  const [rating, setRating] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const { option, pickupAddressText, rating } = await getSellerDeliveryOptions(productId);
        if (alive) {
          setOption(option);
          setPickupText(option === "delivery+pickup" ? (pickupAddressText || "") : "");
          setRating(rating);
        }
      } catch {
        if (alive) {
          setOption("delivery");
          setPickupText("");
          setRating(0);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [productId]);

  return { loading, option, pickupAddressText, rating };
}
