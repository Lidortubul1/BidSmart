// src/pages/productPage/components/ui/ProductLayout.jsx
import React from "react";
import styles from "../../ProductPage.module.css";
import ProductGallery from "../ProductGallery";

export default function ProductLayout({
  images = [],
  children,
  adminPanel,
  hideRightGallery = false,
}) {
  const showRight = !hideRightGallery && Array.isArray(images) && images.length > 0;

  return (
    <div className={styles.page}>
      {/* כרטיס אחיד לכל התצוגות */}
      <div
        className={`${styles.productCard} ${styles.content} ${
          !showRight ? styles.contentNoRight : ""
        }`}
      >
        {showRight && (
          <div className={styles.imageWrapper}>
            <ProductGallery images={images} />
          </div>
        )}
        <div className={styles.details}>{children}</div>
      </div>

      {/* פאנל ניהול מיושר לרוחב הכרטיס */}
      {adminPanel && <div className={styles.adminSection}>{adminPanel}</div>}
    </div>
  );
}
