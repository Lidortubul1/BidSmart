import { useEffect, useState } from "react";
import styles from "./MyBidsPage.module.css";
import axios from "axios";
import { useAuth } from "../../auth/AuthContext";

function MyBidsPage() {
  const { user } = useAuth();
  const [bids, setBids] = useState([]);
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [view, setView] = useState("registered"); // registered | won

  useEffect(() => {
    if (!user?.id_number) return;

    async function fetchData() {
      try {
        const [bidsRes, productsRes, salesRes] = await Promise.all([
          axios.get(
            `http://localhost:5000/api/quotation/user/${user.id_number}`
          ),
          axios.get("http://localhost:5000/api/product"),
          axios.get("http://localhost:5000/api/sale/all"),
        ]);
        setBids(bidsRes.data);
        setProducts(productsRes.data);
        setSales(salesRes.data);
      } catch (err) {
        console.error("שגיאה בטעינת נתונים:", err);
      }
    }

    fetchData();
  }, [user?.id_number]);

  const getProductById = (id) => products.find((p) => p.product_id === id);

  // סינון מוצרים שנרשמת אליהם
  const registeredBids = bids.filter(
    (b) => !sales.some((s) => s.product_id === b.product_id && s.buyer_id_number === user.id_number)
  );
  
  // סינון מוצרים שזכית בהם
  const wonSales = sales.filter((s) => s.buyer_id_number === user?.id_number);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
      .toString()
      .padStart(2, "0")}/${d.getFullYear()}`;
  };

  const handleMarkDelivered = async (product_id) => {
    try {
      await axios.put("http://localhost:5000/api/sale/mark-delivered", {
        product_id,
      });
      setSales((prev) =>
        prev.map((s) =>
          s.product_id === product_id ? { ...s, is_delivered: 1 } : s
        )
      );
    } catch (err) {
      console.error("שגיאה בעדכון סטטוס משלוח:", err);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>ההצעות שלי</h1>

      <div className={styles.buttons}>
        <button onClick={() => setView("registered")}>הצעות שנרשמתי</button>
        <button onClick={() => setView("won")}>מוצרים שזכיתי בהם</button>
      </div>

      {view === "registered" && (
        <>
          <h2 className={styles.subtitle}>רשימת הרשמות</h2>
          {registeredBids.length === 0 ? (
            <p className={styles.empty}>לא נרשמת למוצרים</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>תמונה</th>
                  <th>שם מוצר</th>
                  <th>תאריך התחלה</th>
                  <th>שעת התחלה</th>
                </tr>
              </thead>
              <tbody>
                {registeredBids.map((bid, i) => {
                  const product = getProductById(bid.product_id);
                  if (!product) return null;
                  return (
                    <tr key={i}>
                      <td>
                        <img
                          src={product.image}
                          alt={product.product_name}
                          className={styles.image}
                        />
                      </td>
                      <td>{product.product_name}</td>
                      <td>{formatDate(product.start_date)}</td>
                      <td>{product.start_time}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </>
      )}

      {view === "won" && (
        <>
          <h2 className={styles.subtitle}>מוצרים שזכית בהם</h2>
          {wonSales.length === 0 ? (
            <p className={styles.empty}>לא נמצאו זכיות</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>תמונה</th>
                  <th>שם מוצר</th>
                  <th>מחיר סופי</th>
                  <th>סטטוס משלוח</th>
                  <th>פעולה</th>
                </tr>
              </thead>
              <tbody>
                {wonSales.map((sale, i) => {
                  const product = getProductById(sale.product_id);
                  if (!product) return null;
                  return (
                    <tr key={i}>
                      <td>
                        <img
                          src={product.image}
                          alt={product.product_name}
                          className={styles.image}
                        />
                      </td>
                      <td>{product.product_name}</td>
                      <td>{sale.final_price} ₪</td>
                      <td>
                        {sale.is_delivered === 1
                          ? "📦 נמסר"
                          : "🕒 ממתין למסירה"}
                      </td>
                      <td>
                        {sale.is_delivered === 0 && (
                          <button
                            onClick={() => handleMarkDelivered(sale.product_id)}
                          >
                            סמן כבוצע
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}

export default MyBidsPage;
