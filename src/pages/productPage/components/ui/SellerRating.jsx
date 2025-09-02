import React from "react";
import { renderStars } from "../../../../services/productApi";

export default function SellerRating({ rating }) {
  if (rating === undefined) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, margin: "10px 0", direction: "rtl" }}>
      <strong>דירוג מוכר:</strong>
      {renderStars(rating)}
      <span>({rating})</span>
    </div>
  );
}
