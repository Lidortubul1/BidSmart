import { useEffect, useState } from "react";
import styles from "./MyBidsPage.module.css";
import axios from "axios";
import { useAuth } from "../../auth/AuthContext";

function MyBidsPage() {
  const { user } = useAuth();
  const [bids, setBids] = useState([]);

  useEffect(() => {
    async function fetchMyPaidBids() {
      try {
        const response = await axios.get(
          "http://localhost:5000/api/quotation/all"
        );
        const paidBids = response.data.filter(
          (bid) =>
            bid.buyer_id_number === user?.id_number &&
            bid.payment_status === "completed"
        );
        setBids(paidBids);
      } catch (error) {
        console.error("שגיאה בשליפת ההצעות:", error);
      }
    }

    if (user?.id_number) {
      fetchMyPaidBids();
    }
  }, [user?.id_number]);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>ההצעות ששולמו</h1>
      {bids.length === 0 ? (
        <p className={styles.empty}>לא נמצאו הצעות בתשלום</p>
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
            {bids.map((bid, index) => (
              <tr key={index}>
                <td>
                  <img
                    src={bid.image}
                    alt={bid.product_name}
                    className={styles.image}
                  />
                </td>
                <td>{bid.product_name}</td>
                <td>{bid.price} ₪</td>
                <td>{bid.payment_status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default MyBidsPage;
