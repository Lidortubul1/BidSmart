import styles from "./CustomModal.module.css";
//קומפוננטה לחלון קופץ כללי
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
  const handleBackgroundClick = (e) => {
    if (e.target === e.currentTarget && onCancel) {
      onCancel();
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={handleBackgroundClick}>
      <div className={styles.modalBox}>
        <button className={styles.modalClose} onClick={onCancel}>
          &times;
        </button>

        <h2 className={styles.modalTitle}>{title}</h2>
        <p className={styles.modalMessage}>
          {message.split("\n").map((line, i) => (
            <span key={i}>
              {line}
              <br />
            </span>
          ))}
        </p>

        <div className={styles.modalActions}>
          {cancelText && onCancel && (
            <button
              className={`${styles.modalButton} ${styles.modalCancel}`}
              onClick={onCancel}
            >
              {cancelText}
            </button>
          )}
          {extraButtonText && onExtra && (
            <button
              className={`${styles.modalButton} ${styles.modalExtra}`}
              onClick={onExtra}
            >
              {extraButtonText}
            </button>
          )}
          {confirmText && onConfirm && (
            <button
              className={`${styles.modalButton} ${styles.modalConfirm}`}
              onClick={onConfirm}
            >
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
