import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import ProductList from "../../components/productList/productList";
import styles from "./BuyerDashboard.module.css";
import CategoryBar from "../../components/CategoryBar/CategoryBar";
import { useState, useEffect } from "react";
import { fetchCategories } from "../../services/categoriesApi";

function BuyerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const goToBecomeSeller = () => {
    navigate("/become-seller");
  };
//קטגוריות
  const [categories, setCategories] = useState({});

   useEffect(() => {
      fetchCategories().then((data) => setCategories(data))
       .catch((err) => console.error("שגיאה בטעינת קטגוריות:", err));
     }, []);
     
  return (
    <div className={styles.container}>
      <CategoryBar categories={categories} />
      <div className={styles.welcomeSection}>
        <h1>ברוך הבא לקונה ב-BidSmart!</h1>
        <p>כאן תוכל לצפות בכל המוצרים ולהציע הצעות.</p>

      
          <button onClick={goToBecomeSeller} className={styles.sellButton}>
            רוצה להתחיל למכור פריטים ולהפוך למוכר? לחץ להרשמה כמוכר
          </button>
       
      </div>

      <div className={styles.content}>
        <ProductList />
      </div>
    </div>
  );
}

export default BuyerDashboard;
