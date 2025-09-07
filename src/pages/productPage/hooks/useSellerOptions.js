// src/pages/ProductPage/hooks/useSellerOptions.js
// useSellerOptions: הוק שמבצע שליפה של אפשרויות המשלוח מהמוכר דרך getSellerDeliveryOptions לפי productId, ושומר ב־state. מחזיר את השדות הישנים (loading, option, pickupAddressText, rating) וגם שדות חדשים אופציונליים (pickupAddress, sellerContact). מטפל גם בערכי ברירת מחדל במקרה של שגיאה או אם ה־API לא מחזיר את כל השדות.

import { useEffect, useState } from "react";
import { getSellerDeliveryOptions } from "../../../services/productApi";

/**
 * מחזיר אפשרויות משלוח של המוכר.
 * נשארים אותם שדות ישנים: { loading, option, pickupAddressText, rating }
 * ונוספו שדות חדשים אופציונליים: { pickupAddress, sellerContact }
 */
export default function useSellerOptions(productId) {
  const [state, setState] = useState({
    loading: true,
    option: "delivery",
    pickupAddressText: "",
    rating: 0,
    // חדשים (לא שוברים קוד קיים)
    pickupAddress: null,     // האובייקט המפורק של הכתובת
    sellerContact: null,     // { name?, phone?, email? }
  });

  useEffect(() => {
    let alive = true;

    (async () => {
      // התחלת טעינה
      if (alive) setState((s) => ({ ...s, loading: true }));

      try {
        // שים לב: אם ה־API עדיין לא שולח את השדות החדשים – ניפול לערכי ברירת מחדל
        const res = await getSellerDeliveryOptions(productId);

        if (!alive) return;

        const option = res?.option || "delivery";
        const pickupAddressText =
          option === "delivery+pickup" ? (res?.pickupAddressText || "") : "";

        setState({
          loading: false,
          option,
          pickupAddressText,
          rating: res?.rating ?? 0,

          // חדשים – לא חובה שה־API יחזיר, לכן מגינים עם null
          pickupAddress: res?.pickupAddress ?? null,
          sellerContact: res?.sellerContact ?? null, // { phone, email, name } אם יש
        });
      } catch {
        if (!alive) return;
        setState({
          loading: false,
          option: "delivery",
          pickupAddressText: "",
          rating: 0,
          pickupAddress: null,
          sellerContact: null,
        });
      }
    })();

    return () => { alive = false; };
  }, [productId]);

  // נשמרים שמות ההחזרה הישנים + החדשים
  return state;
}
