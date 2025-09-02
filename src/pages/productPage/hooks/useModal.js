import { useRef, useState } from "react";


// הוק לניהול מודאל כללי: פתיחה/סגירה, תצורה דינמית וטיימר סגירה אוטומטי
export default function useModal(initialCfg = {}) {
  const [modalOpen, setModalOpen] = useState(false); // דגל האם המודאל פתוח
  const [modalCfg, setModalCfg] = useState({         // אובייקט תצורה של המודאל עם ערכי ברירת מחדל
    title: "",
    message: "",
    confirmText: "",
    cancelText: "",
    extraButtonText: "",
    onConfirm: null,
    onCancel: null,
    hideClose: false,
    disableBackdropClose: false,
    ...initialCfg,
  });
  const autoCloseTimerRef = useRef(null); // מצביע לטיימר סגירה אוטומטית כדי לנקות בין פתיחות

  function showModal(cfg) { // מציג מודאל עם תצורה מעודכנת ומנקה טיימר קודם אם קיים
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
    setModalCfg((prev) => ({ ...prev, ...cfg }));
    setModalOpen(true);
  }

  function closeModal() { // סוגר את המודאל
    setModalOpen(false);
  }

  return { modalOpen, modalCfg, setModalCfg, showModal, closeModal, autoCloseTimerRef }; // ממשק ההוק לשימוש בקומפוננטות
}
