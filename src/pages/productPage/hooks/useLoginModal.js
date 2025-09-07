//src\pages\productPage\hooks\useLoginModal.js
// useLoginModal: הוק לניהול חלונית התחברות – מנהל סטייט של מודאל ושל טופס התחברות, מספק פונקציות לפתיחת מודאל כללי (openModal) ולדרישת התחברות (askLogin) עם אפשרות להרשמה או התחברות; מחזיר את כל הסטייטים וה־API לשימוש בקומפוננטות.

import { useState } from "react";

export function useLoginModal(navigate) {
  const [modal, setModal] = useState(null);
  const [showLogin, setShowLogin] = useState(false);

  const openModal = (cfg) =>
    setModal({ ...cfg, onCancel: cfg.onCancel || (() => setModal(null)) });

  const askLogin = () => {
    openModal({
      title: "התחברות נדרשת",
      message: "כדי להירשם למוצר יש להתחבר",
      confirmText: "התחברות",
      onConfirm: () => { setModal(null); setShowLogin(true); },
      extraButtonText: "הרשמה",
      onExtra: () => navigate("/register"),
    });
  };

  return {
    modal,
    setModal,
    showLogin,
    setShowLogin,
    openModal,
    askLogin,
  };
}
