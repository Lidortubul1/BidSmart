import { useEffect, useState } from "react";
import styles from "./MyBidsPage.module.css";
import axios from "axios";
import { useAuth } from "../../auth/AuthContext";

function MyBidsPage() {
  const { user } = useAuth();
  const [bids, setBids] = useState([]);
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [view, setView] = useState("all"); // all | upcoming | won

  useEffect(() => {
    if (!user?.id_number) return;
    console.log("👤 משתמש מחובר:", user);

    async function fetchData() {
      try {
       

        const [quotationRes, productRes, saleRes] = await Promise.all([
          axios.get(`http://localhost:5000/api/quotation/user/${user.id_number}`),
          axios.get("http://localhost:5000/api/product"),
          axios.get("http://localhost:5000/api/sale/all"),
        ]);
        console.log("user.id_number:", user?.id_number);
        console.log("bids:", quotationRes.data);
        setBids(quotationRes.data);
        setProducts(productRes.data);
        setSales(saleRes.data);
      } catch (err) {
        console.error("שגיאה בטעינת נתונים:", err);
      }
    }

    fetchData();
  }, [user?.id_number]);

  const getProductById = (id) => {
    return products.find((p) => p.product_id === id);
  };

  const filteredBids = bids.filter((bid) => {
    const product = getProductById(bid.product_id);
    const isWinner = sales.some(
      (s) => s.product_id === bid.product_id && s.payment_status === "completed"
    );

    if (view === "all") return true;
    if (view === "upcoming")
      return product && new Date(product.start_date) > new Date();
    if (view === "won") return isWinner;
    return false;
  });

  const getViewTitle = () => {
    if (view === "all") return "כל ההצעות שלי";
    if (view === "upcoming") return "הצעות שטרם התחילו";
    if (view === "won") return "מוצרים שזכיתי בהם";
    return "";
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>ההצעות שלי</h1>

      {/* כפתורים */}
      <div className={styles.buttons}>
        <button onClick={() => setView("all")}>כלל ההצעות</button>
        <button onClick={() => setView("upcoming")}>הצעות שטרם התחילו</button>
        <button onClick={() => setView("won")}>מוצרים שזכיתי</button>
      </div>

      {/* כותרת משתנה */}
      <h2 className={styles.subtitle}>{getViewTitle()}</h2>

      {filteredBids.length === 0 ? (
        <p className={styles.empty}>לא נמצאו הצעות מתאימות</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>תמונה</th>
              <th>שם מוצר</th>
              <th>הצעה</th>
              <th>סטטוס תשלום</th>
            </tr>
          </thead>
          <tbody>
            {filteredBids.map((bid, index) => {
              const product = getProductById(bid.product_id);
              return product ? (
                <tr key={index}>
                  <td>
                    <img
                      src={product.image}
                      alt={product.product_name}
                      className={styles.image}
                    />
                  </td>
                  <td>{product.product_name}</td>
                  <td>{bid.price} ₪</td>
                  <td>{bid.payment_status}</td>
                </tr>
              ) : null;
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default MyBidsPage;
