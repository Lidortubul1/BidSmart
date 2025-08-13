import { createPortal } from "react-dom";
import { useEffect } from "react";
import styles from "./CustomModal.module.css";

export default function CustomModal({
  title,
  message,
  confirmText,
  cancelText,
  extraButtonText,
  skipText,
  onConfirm,
  onCancel,
  onExtra,
  onSkip,
  onClose,
  hideClose = false,            // ברירת מחדל
  disableBackdropClose = false, // ברירת מחדל
}) {
  const handleBackgroundClick = (e) => {
    if (e.target === e.currentTarget && !disableBackdropClose) {
      onClose?.();
    }
  };

  // סגירה ב-ESC רק אם לא חסום
  useEffect(() => {
    const onKey = (ev) => {
      if (ev.key === "Escape" && !disableBackdropClose) onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [disableBackdropClose, onClose]);

  return createPortal(
    <div
      className={styles.modalOverlay}
      onClick={handleBackgroundClick}
      role="dialog"
      aria-modal="true"
      dir="rtl"
    >
      <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
        {/* כפתור X יוצג רק אם לא ביקשת להסתיר */}
        {!hideClose && (
          <button
            className={styles.modalClose}
            onClick={() => onClose?.()}
            aria-label="Close"
          >
            &times;
          </button>
        )}

        <h2 className={styles.modalTitle}>{title}</h2>

        <div className={styles.modalMessage}>
          {typeof message === "string"
            ? message.split("\n").map((line, i) => (
                <span key={i}>
                  {line}
                  <br />
                </span>
              ))
            : message}
        </div>

        <div className={styles.modalActions}>
          {cancelText && onCancel && (
            <button className={`${styles.modalButton} ${styles.modalCancel}`} onClick={onCancel}>
              {cancelText}
            </button>
          )}

          {extraButtonText && onExtra && (
            <button className={`${styles.modalButton} ${styles.modalExtra}`} onClick={onExtra}>
              {extraButtonText}
            </button>
          )}

          {skipText && onSkip && (
            <button className={`${styles.modalButton} ${styles.modalSkip}`} onClick={onSkip}>
              {skipText}
            </button>
          )}

          {confirmText && onConfirm && (
            <button className={`${styles.modalButton} ${styles.modalConfirm}`} onClick={onConfirm}>
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.getElementById("modal-root")
  );
}
