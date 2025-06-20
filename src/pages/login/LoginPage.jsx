import { useNavigate } from "react-router-dom";
import { useState } from "react";
import styles from "./LoginPage.module.css";
import { useAuth } from "../../auth/AuthContext";
import LoginForm from "../../components/LoginForm/LoginForm";
import CustomModal from "../../components/CustomModal/CustomModal"; // הוספנו את המודאל

function LoginPage({ isModal = false }) {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: "",
    message: "",
    confirmText: "",
    onConfirm: null,
    cancelText: "",
    onCancel: null,
    extraButtonText: "",
    onExtra: null,
  });

  const openModal = ({ title, message, confirmText, onConfirm }) => {
    setModalConfig({
      title,
      message,
      confirmText,
      onConfirm: () => {
        setShowModal(false);
        onConfirm?.();
      },
      onCancel: () => setShowModal(false),
    });
    setShowModal(true);
  };

  const handleLoginSuccess = (user) => {
    login(user);
    localStorage.setItem("user", JSON.stringify(user));

    if (user.role === "admin") {
      navigate("/admin");
    } else if (user.role === "seller") {
      navigate("/seller");
    } else {
      navigate("/buyer");
    }
  };

  return (
    <div
      className={isModal ? styles.modalContainer : styles.container}
    >
      <div className={styles.formContainer}>
        <LoginForm
          onSuccess={handleLoginSuccess}
          onError={(msg) =>
            openModal({
              title: "שגיאה בהתחברות",
              message: msg,
              confirmText: "סגור",
            })
          }
        />
        <p className={styles.forgotLink}>
          <span onClick={() => navigate("/forgot-password")}>
            שכחת את הסיסמה?
          </span>
        </p>

        <p className={styles.registerLink}>
          <span onClick={() => navigate("/register")}>
            אין לך חשבון? לחץ כאן להרשמה
          </span>
        </p>
      </div>

      {showModal && (
        <CustomModal
          title={modalConfig.title}
          message={modalConfig.message}
          confirmText={modalConfig.confirmText}
          onConfirm={modalConfig.onConfirm}
          cancelText={modalConfig.cancelText}
          onCancel={modalConfig.onCancel}
          extraButtonText={modalConfig.extraButtonText}
          onExtra={modalConfig.onExtra}
        />
      )}
    </div>
  );
}

export default LoginPage;
