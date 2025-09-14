// ================================
// /src/pages/LiveAuction/components/Gallery.jsx
// ================================
// קומפוננטת תצוגה להצגת מידע בסיסי על המוצר + גלריית תמונות.
// אחריות: הצגת תיאור המוצר ורשימת תמונות ממוזערות (thumbnails).

import styles from "../LiveAuction.module.css";

// props:
// - description: string → טקסט תיאור המוצר
// - images: array<string> → מערך נתיבים של תמונות (יחסיים לשרת)


//צד שמאלי של המסך- כולל:תיאור מוצר+גלריית תמונות 
export default function Gallery({ description, images = [] }) {
  return (
    // <section> סמנטי עם כותרת → מקל על נגישות וקורא מסך
    <section className={styles.leftPanel} aria-labelledby="product-info">
      
      {/* כותרת לאזור מידע מוצר */}
      <h2 id="product-info" className={styles.sectionTitle}>
        פרטי מוצר
      </h2>

      {/* תיאור המוצר */}
      <p className={styles.description}>{description}</p>

      {/* 
        גלריית תמונות:
        - role="list" + role="listitem" → נגישות טובה יותר למבנה של רשימה
        - אם אין תמונות מוצגת הודעת placeholder
      */}
      <div className={styles.imageGallery} role="list">
        {images.length ? (
          images.map((url, i) => (
            <img
              key={i}
              role="listitem"
              src={`http://localhost:5000${url}`}
              alt={`תמונה ${i + 1}`}
              className={styles.galleryImage}
              loading="lazy" // טעינה עצלה → משפר ביצועים וחוסך רוחב פס
            />
          ))
        ) : (
          <div className={styles.noImages}>אין תמונות להצגה</div>
        )}
      </div>
    </section>
  );
}
