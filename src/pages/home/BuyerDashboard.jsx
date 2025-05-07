import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import ProductList from "../../components/productList/productList";
import styles from "./BuyerDashboard.module.css";

function BuyerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const goToBecomeSeller = () => {
    navigate("/become-seller");
  };

  return (
    <div className={styles.container}>
      <div className={styles.welcomeSection}>
        <h1>ברוך הבא לקונה ב-BidSmart!</h1>
        <p>כאן תוכל לצפות בכל המוצרים ולהציע הצעות.</p>

        {user?.role === "buyer" && (
          <button onClick={goToBecomeSeller} className={styles.sellButton}>
            רוצה להתחיל למכור פריטים ולהפוך למוכר? לחץ להרשמה כמוכר
          </button>
        )}
      </div>

      <ProductList />
    </div>
  );
}

export default BuyerDashboard;
