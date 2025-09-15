// src/pages/ProductPage/components/ui/SellerRating.jsx
import React from "react";
import styles from "../../ProductPage.module.css";
import { renderStars } from "../../../../services/productApi";

export default function SellerRating({ rating }) {
  if (rating === undefined) return null;
  return (
    <div className={styles.sellerRating}>
      <strong>דירוג מוכר:</strong>
      {renderStars(rating)}
      <span>({rating})</span>
    </div>
  );
}
