import React from "react";
import styles from "../../ProductPage.module.css";
import ProductGallery from "../ProductGallery";

export default function ProductLayout({ images, children, adminPanel }) {
  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <div className={styles.imageWrapper}>
          <ProductGallery images={images || []} />
        </div>
        <div className={styles.details}>{children}</div>
      </div>
      {adminPanel}
    </div>
  );
}
