import styles from "./LiveAuction.module.css";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

function LiveAuction({ productId, buyerId }) {
  const [product, setProduct] = useState(null);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [lastBidder, setLastBidder] = useState(null);
  const [timeLeft, setTimeLeft] = useState(10);
  const [auctionEnded, setAuctionEnded] = useState(false);
  const [winnerId, setWinnerId] = useState(null);
  const [isLive, setIsLive] = useState(false);

  // שליפת פרטי המוצר
  async function fetchProduct() {
    try {
      const res = await fetch(`http://localhost:5000/api/product/${productId}`);
      const data = await res.json();
      setProduct(data);
      setIsLive(data.is_live === 1);
      setCurrentPrice(Number(data.current_price) || 0);
      setLastBidder(data.winner_id_number || null);
    } catch (err) {
      console.error("שגיאה בשליפת מוצר:", err);
    }
  }

  useEffect(() => {
    fetchProduct();
    const interval = setInterval(fetchProduct, 10000); // בדיקה כל 10 שניות

    socket.emit("joinAuction", { productId });

    socket.on("newBid", ({ price, buyerId }) => {
      setCurrentPrice(price);
      setLastBidder(buyerId);
      setTimeLeft(10);
    });

    socket.on("auctionEnded", ({ winnerId, finalPrice }) => {
      setAuctionEnded(true);
      setWinnerId(winnerId);
    });

    return () => {
      clearInterval(interval);
      socket.off("newBid");
      socket.off("auctionEnded");
    };
  }, [productId]);

  useEffect(() => {
    if (!auctionEnded && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft, auctionEnded]);
  //פונקציה לעיצוב תאריך
  const formatDateTime = (dateStr, timeStr) => {
    const date = new Date(
      `${dateStr.split("T")[0]}T${timeStr.padEnd(8, ":00")}`
    );
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} בשעה ${hours}:${minutes}`;
  };
  // מצב לפני התחלה
  if (product && !isLive) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <img
            src={product.image}
            alt={product.product_name}
            className={styles.image}
          />
          <div className={styles.info}>
            <h2>{product.product_name}</h2>
            <p>{product.description}</p>
            <p>
              מחיר פתיחה: <strong>{product.price} ₪</strong>
            </p>
           
            <p className={styles.startText}>
              המכירה תתחיל בתאריך{" "}
              {formatDateTime(product.start_date, product.start_time)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // תצוגת מכירה חיה
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <img
          src={product?.image}
          alt={product?.product_name}
          className={styles.image}
        />
        <div className={styles.info}>
          <h2>{product?.product_name}</h2>
          <p>{product?.description}</p>
          <p className={styles.currentPrice}>מחיר נוכחי: {currentPrice} ₪</p>
          <p className={styles.lastBidInfo}>
            {lastBidder === buyerId
              ? "✅ נתת את ההצעה האחרונה!"
              : "💬 ניתנה הצעה ממשתמש! לחץ הגש הצעה כדי לזכות!"}
          </p>

          {!auctionEnded && (
            <>
              <div className={styles.timerBar}>
                <div
                  className={styles.timerFill}
                  style={{ width: `${(timeLeft / 10) * 100}%` }}
                ></div>
              </div>
              <p className={styles.timeText}>
                ⌛ זמן להגשת הצעה: {timeLeft} שניות
              </p>

              {buyerId !== lastBidder && (
                <button
                  className={styles.bidButton}
                  onClick={() =>
                    socket.emit("placeBid", { productId, buyerId })
                  }
                >
                  הגש הצעה (+10 ₪)
                </button>
              )}
            </>
          )}

          {auctionEnded && (
            <div className={styles.resultBox}>
              {buyerId === winnerId ? (
                <>
                  <p className={styles.winner}>🎉 זכית במכירה!</p>
                  <button
                    className={styles.paymentButton}
                    onClick={async () => {
                      try {
                        const res = await fetch(
                          "http://localhost:5000/api/payment/create-order",
                          {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ product_id: productId }),
                          }
                        );
                        const data = await res.json();
                        const approveUrl = data?.links?.find(
                          (link) => link.rel === "approve"
                        )?.href;
                        if (approveUrl) window.location.href = approveUrl;
                        else alert("שגיאה בהמשך לתשלום");
                      } catch (err) {
                        alert("שגיאה בתשלום");
                      }
                    }}
                  >
                    עבור לתשלום
                  </button>
                </>
              ) : (
                <p className={styles.loser}>❌ המכירה הסתיימה. לא זכית.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LiveAuction;
