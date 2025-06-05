import styles from "./CustomModal.module.css";

export default function CustomModal({
  title,
  message,
  confirmText,
  cancelText,
  extraButtonText,
  onConfirm,
  onCancel,
  onExtra,
}) {
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.message}>{message}</p>
        <div className={styles.actions}>
          {cancelText && onCancel && (
            <button className={styles.cancel} onClick={onCancel}>
              {cancelText}
            </button>
          )}

          {extraButtonText && onExtra && (
            <button className={styles.extra} onClick={onExtra}>
              {extraButtonText}
            </button>
          )}

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
