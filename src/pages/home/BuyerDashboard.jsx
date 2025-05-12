import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import ProductList from "../../components/productList/productList";
import styles from "./BuyerDashboard.module.css";
import CategoryBar from "../../components/CategoryBar/CategoryBar";
import { useState, useEffect } from "react";
import axios from "axios";

function BuyerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const goToBecomeSeller = () => {
    navigate("/become-seller");
  };
//קטגוריות
  const [categories, setCategories] = useState({});

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await axios.get("http://localhost:5000/api/categories");
        setCategories(res.data);
      } catch (err) {
        console.error("שגיאה בטעינת קטגוריות:", err);
      }
    }
    fetchCategories();
  }, []);
  return (
    <div className={styles.container}>
      <div>
        <CategoryBar categories={categories} />
      </div>
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
