import styles from "./LiveAuction.module.css";
import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import CustomModal from "../../components/CustomModal/CustomModal.jsx";
import { getProductById } from "../../services/productApi.js";
import { createOrder } from "../../services/paymentApi.js";

const socket = io("http://localhost:5000");

function LiveAuction() {
  const { id: productId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const buyerId = user?.id_number;

  const [product, setProduct] = useState(null);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [lastBidder, setLastBidder] = useState(null);
  const [timeLeft, setTimeLeft] = useState(10);
  const [auctionEnded, setAuctionEnded] = useState(false);
  const [winnerId, setWinnerId] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [chatLog, setChatLog] = useState([]);
  const anonymizedUsers = useRef({});
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

  useEffect(() => {
    getProductById(productId).then((data) => {
      setProduct(data);
      setIsLive(data.is_live === 1);
      setCurrentPrice(Number(data.current_price) || 0);
      setLastBidder(data.winner_id_number || null);
    });

    const interval = setInterval(() => {
      getProductById(productId).then((data) => {
        setProduct(data);
        setCurrentPrice(Number(data.current_price) || 0);
      });
    }, 10000); //10 שניות

    socket.emit("joinAuction", { productId });

    socket.on("newBid", ({ price, buyerId }) => {
      setCurrentPrice(price);
      setLastBidder(buyerId);
      setTimeLeft(10);
      const { name, color } = getAnonymizedData(buyerId);
      setChatLog((prev) => [
        ...prev,
        { text: `${name} הציע ${price} ₪`, color },
      ]);
    });

    socket.on("auctionEnded", ({ winnerId, finalPrice }) => {
      setAuctionEnded(true);
      setWinnerId(winnerId);
      setCurrentPrice(Number(finalPrice) || 0);
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

  const getAnonymizedData = (id) => {
    if (!anonymizedUsers.current[id]) {
      const shortId = String(id).slice(-3);
      const colors = ["#007bff", "#28a745", "#dc3545", "#ffc107", "#6610f2"];
      anonymizedUsers.current[id] = {
        name: `משתתף#${shortId}`,
        color: colors[Math.floor(Math.random() * colors.length)],
      };
    }
    return anonymizedUsers.current[id];
  };

  const handleBid = (amount = 10) => {
    socket.emit("placeBid", { productId, buyerId, customAmount: amount });
  };

 const formatDateAndTime = (dateStr) => {
  if (!dateStr) return "תאריך לא זמין";
  const date = new Date(dateStr);
  const formattedDate = date.toLocaleDateString("he-IL");
  const formattedTime = date.toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${formattedDate} בשעה ${formattedTime}`;
};


  if (!product) return <p>טוען מוצר...</p>;
if (product && !isLive) {
  return (
    <div className={styles.container}>
      <div className={styles.cardWrapper}>
        <div className={styles.cardGrid}>
          <div className={styles.leftPanel}>
            <h2>{product.product_name}</h2>
            <p>{product.description}</p>
            <div className={styles.imageGallery}>
              {product.images?.map((url, i) => (
                <img
                  key={i}
                  src={`http://localhost:5000${url}`}
                  alt={`תמונה ${i + 1}`}
                  className={styles.galleryImage}
                />
              ))}
            </div>
          </div>

          <div className={styles.centerPanel}>
            <p className={styles.currentPrice}>מחיר פתיחה: {product.price} ₪</p>
           <p className={styles.startText}>
  המכירה תתחיל בתאריך{" "}
  {product.start_date
    ? formatDateAndTime(product.start_date)
    : "תאריך לא זמין"}
</p>

          </div>


        </div>
      </div>
    </div>
  );
}


  return (
    <div className={styles.container}>
      <div className={styles.cardWrapper}>
        <div className={styles.cardGrid}>
          <div className={styles.leftPanel}>
            <h2>{product.product_name}</h2>
            <p>{product.description}</p>
            <div className={styles.imageGallery}>
              {product.images?.map((url, i) => (
                <img
                  key={i}
                  src={`http://localhost:5000${url}`}
                  alt={`תמונה ${i + 1}`}
                  className={styles.galleryImage}
                />
              ))}
            </div>
          </div>

          <div className={styles.centerPanel}>
            <p className={styles.currentPrice}>מחיר נוכחי: {currentPrice} ₪</p>
            <p className={styles.lastBidInfo}>
              {lastBidder === buyerId
                ? "נתת את ההצעה האחרונה!"
                : "ניתנה הצעה ממשתמש! לחץ הגש הצעה כדי לזכות!"}
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
                <button
                  className={styles.bidButton}
                  onClick={() => handleBid(Number(product.bid_increment))}
                >
                  הגש הצעה של +{product.bid_increment} ₪
                </button>
              </>
            )}

            {auctionEnded && (
              <>
                {buyerId === winnerId ? (
                  <>
                    <p className={styles.winner}>🎉 זכית במכירה!</p>
                    <button
                      className={styles.paymentButton}
                      onClick={() => {
                        const total = Number(currentPrice);

                        showModal({
                          title: "🧾 פירוט המחיר",
                          message: `המחיר הסופי הינו ₪${total}`,
                          confirmText: "עבור לתשלום",
                          onConfirm: async () => {
                            try {
                              const data = await createOrder(productId);
                              const approveUrl = data?.links?.find(
                                (link) => link.rel === "approve"
                              )?.href;
                              if (approveUrl) {
                                window.location.href = approveUrl;
                              } else {
                                alert("שגיאה בקבלת קישור לתשלום");
                              }
                            } catch (err) {
                              alert("שגיאה ביצירת בקשת תשלום");
                            }
                          },
                          onCancel: () => setModalVisible(false),
                        });
                      }}
                    >
                      עבור לתשלום
                    </button>
                  </>
                ) : (
                  <p className={styles.loser}>❌ המכירה הסתיימה. לא זכית.</p>
                )}
              </>
            )}
          </div>

          <div className={styles.chatPanel}>
            <h4>הצעות בזמן אמת:</h4>
            <div className={styles.chatLog}>
              {chatLog.map((msg, i) => (
                <p key={i} style={{ color: msg.color }}>
                  {msg.text}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>

      {modalVisible && (
        <CustomModal
          title={modalContent.title}
          message={modalContent.message}
          confirmText={modalContent.confirmText}
          cancelText={modalContent.cancelText}
          onConfirm={modalContent.onConfirm}
          onCancel={modalContent.onCancel}
        />
      )}
    </div>
  );
}

export default LiveAuction;
