import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import axios from "axios";
import styles from "./ProductPage.module.css";

function ProductPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [bidAmount, setBidAmount] = useState("");
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchProduct() {
      try {
        const response = await axios.get(`http://localhost:5000/api/product`);
        const found = response.data.find((p) => p.product_id === parseInt(id));
        setProduct(found);
      } catch (err) {
        console.error("שגיאה בטעינת מוצר:", err);
      }
    }

    fetchProduct();
  }, [id]);

  const handleRegisterToSale = async () => {
    if (!user?.id_number) {
      alert("כדי להירשם למכירה, יש להשלים תעודת זהות.");
      navigate("/become-seller");
      return;
    }

    try {
      const res = await axios.post("http://localhost:5000/api/quotation", {
        product_id: product.product_id,
        buyer_id_number: user.id_number,
        price: 0,
      });

      if (res.data.success) {
        alert("נרשמת בהצלחה למכירה");
      } else {
        alert(res.data.message || "שגיאה בהרשמה למכירה");
      }
    } catch (err) {
      console.error("שגיאה:", err);
      alert("שגיאה בשרת");
    }
  };

  const handleBidSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.post("http://localhost:5000/api/quotation", {
        product_id: product.product_id,
        buyer_id_number: user?.id_number,
        price: parseFloat(bidAmount),
      });

      if (res.data.success) {
        alert("הצעתך התקבלה!");
        setBidAmount("");
      } else {
        alert(res.data.message || "שגיאה בהצעה");
      }
    } catch (err) {
      console.error("שגיאה בשליחת הצעה", err);
      alert("שגיאה בשליחת ההצעה");
    }
  };

  if (!product) return <p>טוען מוצר...</p>;

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <div className={styles.imageWrapper}>
          <img
            src={product.image}
            alt={product.product_name}
            className={styles.image}
          />
        </div>
        <div className={styles.details}>
          <h1>{product.product_name}</h1>
          <p className={styles.description}>{product.description}</p>
          <p className={styles.price}>מחיר פתיחה: {product.price} ₪</p>
          <p className={styles.status}>סטטוס: {product.product_status}</p>

          {/* כפתור הרשמה למכירה */}
          {user?.role === "buyer" && (
            <button className={styles.bidButton} onClick={handleRegisterToSale}>
              לחץ להרשמה למכירה
            </button>
          )}

          {/* טופס הגשת הצעת מחיר (שמור לעתיד) */}
          {user?.role === "buyer" && (
            <form onSubmit={handleBidSubmit} className={styles.bidForm}>
              <input
                type="number"
                placeholder="סכום ההצעה שלך"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                required
              />
              <button type="submit">שלח הצעה</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductPage;
