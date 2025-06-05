import { useNavigate } from "react-router-dom";
import styles from "./LoginPage.module.css";
import backgroundImage from "../../assets/images/background.jpg";
import { useAuth } from "../../auth/AuthContext";
import LoginForm from "../../components/LoginForm/LoginForm"; // מסלול לקובץ החדש

function LoginPage({ isModal = false }) {
  const navigate = useNavigate();
  const { login } = useAuth();

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
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      <div className={styles.formContainer}>
        <LoginForm
          onSuccess={handleLoginSuccess}
          onError={(msg) => alert(msg)}
        />
        <p className={styles.forgotLink}>
          <span onClick={() => navigate("/forgot-password")}>
            שכחת את הסיסמה?
          </span>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
