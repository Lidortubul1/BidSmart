import styles from "./CustomModal.module.css";

// קומפוננטה כללית להצגת מודאל קופץ
export default function CustomModal({
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  extraButtonText,
  onExtra,
}) {
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.message}>{message}</p>
        <div className={styles.actions}>
          {/* כפתור ביטול - מוצג רק אם גם הפונקציה וגם הטקסט קיימים */}
          {cancelText && onCancel && (
            <button className={styles.cancel} onClick={onCancel}>
              {cancelText}
            </button>
          )}

          {/* כפתור נוסף - מוצג רק אם גם הפונקציה וגם הטקסט קיימים */}
          {extraButtonText && onExtra && (
            <button className={styles.cancel} onClick={onExtra}>
              {extraButtonText}
            </button>
          )}

          {/* כפתור אישור - מוצג רק אם גם הפונקציה וגם הטקסט קיימים */}
          {confirmText && onConfirm && (
            <button className={styles.confirm} onClick={onConfirm}>
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
