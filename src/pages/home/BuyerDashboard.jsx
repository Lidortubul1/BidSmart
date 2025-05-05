import ProductList from "../../components/productList/productList";
import styles from "./BuyerDashboard.module.css";

function BuyerDashboard() {
  return (
    <div className={styles.container}>
      <div className={styles.welcomeSection}>
        <h1>ברוך הבא לקונה ב-BidSmart!</h1>
        <p>כאן תוכל לצפות בכל המוצרים ולהציע הצעות.</p>
      </div>

      <ProductList />
    </div>
  );
}

export default BuyerDashboard;
