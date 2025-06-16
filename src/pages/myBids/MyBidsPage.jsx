import { useEffect, useState } from "react";
import styles from "./MyBidsPage.module.css";
import { getUserBids } from "../../services/quotationApi";
import { getAllProducts } from "../../services/productApi";
import { getAllSales, markProductDelivered } from "../../services/saleApi";
import { useAuth } from "../../auth/AuthContext";
import CustomModal from "../../components/CustomModal/CustomModal";

function MyBidsPage() {
  const { user } = useAuth();
  const [bids, setBids] = useState([]);
  const [sales, setSales] = useState([]);
  const [view, setView] = useState("registered");

  // מודאל כללי
  const [modalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState({
    title: "",
    message: "",
    confirmText: "",
    cancelText: "",
    onConfirm: null,
    onCancel: null,
  });

  const showModal = ({
    title,
    message,
    confirmText,
    cancelText,
    onConfirm,
    onCancel,
  }) => {
    setModalContent({
      title,
      message,
      confirmText,
      cancelText,
      onConfirm,
      onCancel,
    });
    setModalVisible(true);
  };

  // טעינת הצעות, מוצרים ומכירות
  useEffect(() => {
    if (!user?.id_number) return;

    async function fetchData() {
      try {

        const [bidsRes, salesRes] = await Promise.all([
          getUserBids(user.id_number),
          getAllSales(),
        ]);

        setBids(bidsRes.data);
        setSales(salesRes.data);
        
        
        setBids(bidsRes.data);
        console.log("✅ כל ההצעות:", bidsRes.data);
        console.log("✅ כמות הצעות:", bidsRes.data.length);

        setSales(salesRes.data);
      } catch (err) {
        showModal({
          title: "שגיאה",
          message: "שגיאה בטעינת הנתונים",
          confirmText: "סגור",
          onConfirm: () => setModalVisible(false),
        });
      }
    }

    fetchData();
  }, [user?.id_number]);


  const registeredBids = bids;


  const wonSales = sales.filter((s) => s.buyer_id_number === user?.id_number);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
      .toString()
      .padStart(2, "0")}/${d.getFullYear()}`;
  };

  // סימון מוצר כ"נמסר"
  const handleMarkDelivered = async (product_id) => {
    try {
      await markProductDelivered(product_id);

      setSales((prev) =>
        prev.map((s) =>
          s.product_id === product_id ? { ...s, is_delivered: 1 } : s
        )
      );
    } catch (err) {
      showModal({
        title: "שגיאה",
        message: "שגיאה בעת סימון כבוצע",
        confirmText: "סגור",
        onConfirm: () => setModalVisible(false),
      });
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
                  return (
                    <tr key={i}>
                      <td>
                        <img
                          src={`http://localhost:5000${bid.images?.[0] || ""}`}
                          alt={bid.product_name}
                          className={styles.image}
                        />
                      </td>
                      <td>{bid.product_name}</td>
                      <td>{formatDate(bid.start_date)}</td>
                      <td>{bid.start_time}</td>
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
                  // חיפוש המידע על המוצר מתוך bids
                  const bidInfo = bids.find(
                    (b) => b.product_id === sale.product_id
                  );

                  if (!bidInfo) return null;

                  return (
                    <tr key={i}>
                      <td>
                        <img
                          src={`http://localhost:5000${
                            bidInfo.images?.[0] || ""
                          }`}
                          alt={bidInfo.product_name}
                          className={styles.image}
                        />
                      </td>
                      <td>{bidInfo.product_name}</td>
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

      {modalVisible && (
        <CustomModal
          title={modalContent.title}
          message={modalContent.message}
          confirmText={modalContent.confirmText}
          cancelText={modalContent.cancelText}
          onConfirm={modalContent.onConfirm}
          onCancel={modalContent.onCancel || (() => setModalVisible(false))}
        />
      )}
    </div>
  );
}

export default MyBidsPage;
