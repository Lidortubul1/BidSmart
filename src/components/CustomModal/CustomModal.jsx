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
          {onCancel && (
            <button className={styles.cancel} onClick={onCancel}>
              {cancelText || "ביטול"}
            </button>
          )}
          {onExtra && (
            <button className={styles.cancel} onClick={onExtra}>
              {extraButtonText}
            </button>
          )}
          {onConfirm && (
            <button className={styles.confirm} onClick={onConfirm}>
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
