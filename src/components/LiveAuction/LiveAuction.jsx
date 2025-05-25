import styles from "./LiveAuction.module.css";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

function LiveAuction({ productId, buyerId }) {
  const [currentPrice, setCurrentPrice] = useState(0);
  const [lastBidder, setLastBidder] = useState(null);
  const [timeLeft, setTimeLeft] = useState(10);
  const [auctionEnded, setAuctionEnded] = useState(false);
  const [winnerId, setWinnerId] = useState(null);

  useEffect(() => {
    async function fetchProduct() {
      try {
        const res = await fetch(
          `http://localhost:5000/api/product/${productId}`
        );
        const data = await res.json();
        setCurrentPrice(Number(data.current_price) || 0);
        setLastBidder(data.winner_id_number || null);
      } catch (err) {
        console.error("שגיאה בשליפת מחיר נוכחי:", err);
      }
    }

    fetchProduct();
    socket.emit("joinAuction", { productId });

    const handleNewBid = ({ price, buyerId }) => {
      setCurrentPrice(price);
      setLastBidder(buyerId);
      setTimeLeft(10);
    };

    const handleAuctionEnd = ({ winnerId, finalPrice }) => {
      setAuctionEnded(true);
      setWinnerId(winnerId);
      alert(`המכירה הסתיימה! הזוכה: ${winnerId}, סכום: ${finalPrice} ₪`);
    };

    socket.on("newBid", handleNewBid);
    socket.on("auctionEnded", handleAuctionEnd);

    return () => {
      socket.off("newBid", handleNewBid);
      socket.off("auctionEnded", handleAuctionEnd);
    };
  }, [productId]);

  useEffect(() => {
    if (auctionEnded || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, auctionEnded]);

  const handleBid = () => {
    socket.emit("placeBid", { productId, buyerId });
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.header}>🛒 מכירה חיה</h2>
      <p className={styles.price}>
        מחיר נוכחי: <strong>{currentPrice} ₪</strong>
      </p>
      <p className={styles.bidder}>מציע אחרון: {lastBidder || "עדיין אין"}</p>
      {!auctionEnded && (
        <p className={styles.timer}>⌛ זמן לסיום: {timeLeft} שניות</p>
      )}

      {!auctionEnded && buyerId !== lastBidder && (
        <button className={styles.button} onClick={handleBid}>
          הגש הצעה (+10 ₪)
        </button>
      )}

      {auctionEnded && <p className={styles.ended}>המכירה הסתיימה</p>}
      {auctionEnded && (
        <div>
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

                    if (approveUrl) {
                      window.location.href = approveUrl;
                    } else {
                      alert("לא ניתן להמשיך לתשלום");
                    }
                  } catch (err) {
                    console.error("שגיאה בתשלום:", err);
                    alert("שגיאה במהלך התשלום");
                  }
                }}
              >
                עבור לתשלום
              </button>
            </>
          ) : (
            <p className={styles.loser}>
              ❌ המכירה הסתיימה! לא זכית, אך תוכל להשתתף במכרזים אחרים.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default LiveAuction;
