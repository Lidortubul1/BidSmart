// src/pages/ProductPage/components/ProductGallery.jsx
import React, { useState } from "react";
import styles from "../ProductPage.module.css";

export default function ProductGallery({ images = [] }) {
  const [idx, setIdx] = useState(0);
  const [open, setOpen] = useState(false);
  if (!images.length) return <p>אין תמונות זמינות</p>;

  return (
    <>
      <div className={styles.gallery}>
        <img
          src={`http://localhost:5000${images[idx]}`}
          alt={`תמונה ${idx + 1}`}
          onClick={() => setOpen(true)}
          className={styles.image}
          style={{ cursor: "zoom-in" }}
        />
        <div className={styles.imageControls}>
          <button className={styles.imageButton}
            onClick={() => setIdx((p) => (p - 1 + images.length) % images.length)}
            aria-label="תמונה קודמת">‹</button>
          <span className={styles.imageIndex}>{idx + 1} / {images.length}</span>
          <button className={styles.imageButton}
            onClick={() => setIdx((p) => (p + 1) % images.length)}
            aria-label="תמונה הבאה">›</button>
        </div>
      </div>

      {open && (
        <div className={styles.modalOverlay} onClick={() => setOpen(false)}>
          <img
            src={`http://localhost:5000${images[idx]}`}
            alt="תמונה מוגדלת"
            className={styles.modalImage}
          />
        </div>
      )}
    </>
  );
}
