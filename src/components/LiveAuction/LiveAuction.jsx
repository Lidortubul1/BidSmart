import styles from "./LiveAuction.module.css";
import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { useParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import CustomModal from "../../components/CustomModal/CustomModal.jsx";
import { getProductById } from "../../services/productApi.js";
import { createOrder } from "../../services/paymentApi.js";
import { endAuction } from "../../services/auctionApi"; // axios -> /api/auction/end/:productId

// מחבר פעם אחת (מחוץ לקומפוננטה כדי להימנע מחיבורים כפולים ב-StrictMode)
const socket = io("http://localhost:5000");

// ממיר end_time מפורמט TIME ("HH:MM:SS") לשניות או ממספר בדקות
function timeToSeconds(endTime) {
  if (endTime == null) return 0;
  if (typeof endTime === "number") return Math.max(0, Math.floor(endTime) * 60);
  if (typeof endTime === "string") {
    const parts = endTime.split(":").map((x) => parseInt(x || "0", 10));
    const [h, m, s] = [parts[0] || 0, parts[1] || 0, parts[2] || 0];
    return h * 3600 + m * 60 + s;
  }
  return 0;
}

function formatDateAndTime(dateStr) {
  if (!dateStr) return "תאריך לא זמין";
  const date = new Date(dateStr);
  const formattedDate = date.toLocaleDateString("he-IL");
  const formattedTime = date.toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
  });
  
  return `${formattedDate} בשעה ${formattedTime}`;
}

function fmtHMS(total) {
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return d > 0
    ? `${d} ימים ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(
        s
      ).padStart(2, "0")}`
    : `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(
        s
      ).padStart(2, "0")}`;
}

function LiveAuction() {
  const { id: productId } = useParams();
  const { user } = useAuth();
  const buyerId = user?.id_number;

  const [product, setProduct] = useState(null);

  // מצבים עיקריים
  const [isLive, setIsLive] = useState(false); // לייב כרגע
  const [auctionEnded, setAuctionEnded] = useState(false); // נגמרה
  const [winnerId, setWinnerId] = useState(null);

  // קאונטדאונים
  const [startCountdown, setStartCountdown] = useState(null); // עד התחלה (שניות)
  const [auctionTimeLeft, setAuctionTimeLeft] = useState(null); // עד סוף (שניות)
  const [roundTimeLeft, setRoundTimeLeft] = useState(null); // טיימר סבב של 15 שניות

  // מצב הצעות
  const [currentPrice, setCurrentPrice] = useState(0);
  const [lastBidder, setLastBidder] = useState(null);
  const [canBid, setCanBid] = useState(true);

  // לוג צ'אט (אופציונלי)
  const [chatLog, setChatLog] = useState([]);
  const anonymizedUsers = useRef({});
// בתוך הקומפוננטה LiveAuction, אחרי ש יש product/currentPrice/lastBidder:
const openingPrice = Number(product?.price) || 0;
const hasFirstBid  = (Number(currentPrice) > openingPrice) || !!lastBidder;


  // מודאל
  const [modalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState({
    title: "",
    message: "",
    confirmText: "",
    cancelText: "",
    onConfirm: null,
    onCancel: null,
  });
  const showModal = ({ title, message, confirmText, cancelText, onConfirm, onCancel }) => {
    setModalContent({ title, message, confirmText, cancelText, onConfirm, onCancel });
    setModalVisible(true);
  };

  // טעינת מוצר + חישוב מצב ראשוני 
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const data = await getProductById(productId);
      if (!mounted) return;

      setProduct(data);

     const startMs = new Date(data.start_date).getTime();
const auctionLenSec = timeToSeconds(data.end_time);
const endMs = startMs + auctionLenSec * 1000;
const now = Date.now();

// נגמרה אם כבר יש זוכה או שהזמן עבר
const ended = (data.winner_id_number != null) || (now >= endMs);

// לייב רק אם is_live=1 וגם לא נגמרה
const live = (data.is_live === 1) && !ended;

setIsLive(live);
setAuctionEnded(ended);
setWinnerId(data.winner_id_number || null);

setCurrentPrice(Number(data.current_price) || 0);
setLastBidder(ended ? data.winner_id_number : null);

// לאפשר הצעות כברירת מחדל
setCanBid(true);

// אם המכירה בלייב אבל טרם הייתה הצעה – לא מפעילים טיימר סבב
if ((data.is_live === 1) && !ended) {
  const opening = Number(data.price) || 0;
  const curr = Number(data.current_price) || 0;
  if (curr <= opening) {
    setRoundTimeLeft(null);
  }
}

// טיימרים
setAuctionTimeLeft(Math.max(Math.floor((endMs - now) / 1000), 0));

if (!live && !ended && now < startMs) {
  const untilStart = Math.max(Math.floor((startMs - now) / 1000), 0);
  setStartCountdown(untilStart);
} else {
  setStartCountdown(null);
}
    };
    load();
    const interval = setInterval(load, 10000); // פולינג עדין

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [productId]);

  // הצטרפות לחדר + מאזינים ל-Started/Ended
  useEffect(() => {
    // מצטרפים לחדר המכירה
    socket.emit("joinAuction", { productId });

// כשהשרת מודיע שהמכירה התחילה
// היה: setRoundTimeLeft(15);
const onAuctionStarted = () => {
  setIsLive(true);
  setAuctionEnded(false);
  setStartCountdown(null);

  // ⛔️ לא מפעילים 15ש׳ לפני הצעה ראשונה
  setRoundTimeLeft(null);

  setAuctionTimeLeft((prev) => {
    if (!product) return prev;
    const startMs = new Date(product.start_date).getTime();
    const endMs = startMs + timeToSeconds(product.end_time) * 1000;
    return Math.max(Math.floor((endMs - Date.now()) / 1000), 0);
  });
};


 // כשהשרת מודיע שהמכירה הסתיימה
const onAuctionEnded = ({ winnerId, finalPrice }) => {
  setAuctionEnded(true);
  setIsLive(false);
  setWinnerId(winnerId || null);
  setCurrentPrice(Number(finalPrice) || 0);
};

    socket.on("auctionStarted", onAuctionStarted);
    socket.on("auctionEnded", onAuctionEnded);

    return () => {
      socket.off("auctionStarted", onAuctionStarted);
      socket.off("auctionEnded", onAuctionEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, product]);

  // מאזין להצעות חדשות
  useEffect(() => {
    const onNewBid = ({ price, buyerId: bidderId }) => {
      setCurrentPrice(price);
      setLastBidder(bidderId);
      setRoundTimeLeft(15);
      if (bidderId !== buyerId) setCanBid(true);

      // לוג מיני (אופציונלי)
      const { name, color } = getAnon(bidderId);
      setChatLog((prev) => [...prev, { text: `${name} הציע ${price} ₪`, color }]);
    };

    socket.on("newBid", onNewBid);
    return () => socket.off("newBid", onNewBid);
  }, [buyerId]);

// טיימר סבב 15 שניות
useEffect(() => {
  // לא מריצים לפני הצעה ראשונה
  if (!isLive || auctionEnded || !hasFirstBid) return;

  if (roundTimeLeft == null) return; // עדיין לא הופעל
  if (roundTimeLeft <= 0) {
    finishAuctionOnServer();
    return;
  }
  const t = setInterval(() => setRoundTimeLeft((v) => v - 1), 1000);
  return () => clearInterval(t);
}, [isLive, auctionEnded, hasFirstBid, roundTimeLeft]);




  // קאונטדאון לתחילת מכירה
  useEffect(() => {
    if (isLive || startCountdown == null) return;

    if (startCountdown <= 0) {
      // מבקשים מהשרת להתחיל (הוא ישדר לכולם auctionStarted)
      socket.emit("requestStartAuction", { productId });
      setStartCountdown(null);

      // Fallback קטן אם לא הגיע אירוע
      const t = setTimeout(() => {
        setIsLive(true);
        setAuctionEnded(false);
        setRoundTimeLeft(null);
        if (product) {
          const startMs = new Date(product.start_date).getTime();
          const endMs = startMs + timeToSeconds(product.end_time) * 1000;
          setAuctionTimeLeft(Math.max(Math.floor((endMs - Date.now()) / 1000), 0));
        }
      }, 2000);
      return () => clearTimeout(t);
    }

    const iv = setInterval(() => setStartCountdown((v) => v - 1), 1000);
    return () => clearInterval(iv);
  }, [isLive, startCountdown, productId, product]);

  // טיימר כללי של המכירה
  useEffect(() => {
    if (auctionTimeLeft == null || auctionEnded) return;
    if (auctionTimeLeft <= 0) {
      finishAuctionOnServer();
      return;
    }
    const t = setInterval(() => setAuctionTimeLeft((v) => v - 1), 1000);
    return () => clearInterval(t);
  }, [auctionTimeLeft, auctionEnded]);

  function getAnon(id) {
    if (!anonymizedUsers.current[id]) {
      const shortId = String(id ?? "").slice(-3);
      const colors = ["#007bff", "#28a745", "#dc3545", "#ffc107", "#6610f2"];
      anonymizedUsers.current[id] = {
        name: `משתתף#${shortId || "???"} `,
        color: colors[Math.floor(Math.random() * colors.length)],
      };
    }
    return anonymizedUsers.current[id];
  }

  async function finishAuctionOnServer() {
    try {
      const data = await endAuction(productId);
      setWinnerId(data.winnerId || null);
      setCurrentPrice(data.finalPrice != null ? Number(data.finalPrice) : currentPrice);
      setAuctionEnded(true);
      setIsLive(false);
    } catch (err) {
      console.error("שגיאה בסיום מכירה:", err);
    }
  }

  function handleBid(amount = 10) {
    if (!isLive || auctionEnded || !canBid) return;
    socket.emit("placeBid", { productId, buyerId, customAmount: amount });
    setCanBid(false);
  }

  if (!product) return <p>טוען מוצר...</p>;

  // ===== מסך "נגמרה" =====
  if (auctionEnded) {
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
              {buyerId === winnerId ? (
                <>
                  <p className={styles.winner}>🎉 זכית במכירה!</p>
                  <button
                    className={styles.paymentButton}
                    onClick={async () => {
                      const total = Number(currentPrice);
                      showModal({
                        title: "🧾 פירוט המחיר",
                        message: `המחיר הסופי הינו ₪${total}`,
                        confirmText: "עבור לתשלום",
                        onConfirm: async () => {
                          try {
                            const data = await createOrder(productId);
                            const approveUrl = data?.links?.find((l) => l.rel === "approve")?.href;
                            if (approveUrl) window.location.href = approveUrl;
                            else alert("שגיאה בקבלת קישור לתשלום");
                          } catch {
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

  // ===== מסך "עוד לא התחילה" =====
  if (!isLive && !auctionEnded) {
    return (
      <div className={styles.container}>
        <div className={styles.cardWrapper}>
          <div className={styles.cardGrid}>
            {/* שמאל: תמונות + תיאור (בדיוק כמו בלייב) */}
            <div className={styles.leftPanel}>
              <h2>{product.product_name}</h2>
              <p>{product.description}</p>
              <div className={styles.imageGallery}>
                {product.images?.length ? (
                  product.images.map((url, i) => (
                    <img
                      key={i}
                      src={`http://localhost:5000${url}`}
                      alt={`תמונה ${i + 1}`}
                      className={styles.galleryImage}
                    />
                  ))
                ) : (
                  <div className={styles.noImages}>אין תמונות להצגה</div>
                )}
              </div>
            </div>

            {/* מרכז: מתי מתחילה + קאונטדאון + כפתור מנוטרל */}
            <div className={styles.centerPanel}>
              <p className={styles.currentPrice}>מחיר פתיחה: {product.price} ₪</p>
              <p className={styles.startText}>
               המכירה תחל בתאריך{" "}
                {product.start_date ? formatDateAndTime(product.start_date) : "תאריך לא זמין"}
              </p>
              {startCountdown != null && (
                <p className={styles.countdownToStart}>ספירה לאחור: {fmtHMS(startCountdown)}</p>
              )}
              <button className={styles.bidButton} disabled>
                ההגשה תיפתח בתחילת המכירה
              </button>
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

  // ===== מסך "לייב" =====
  const minutesLeft = auctionTimeLeft != null ? Math.floor(auctionTimeLeft / 60) : 0;
  const secondsLeft = auctionTimeLeft != null ? auctionTimeLeft % 60 : 0;

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
  <p className={styles.currentPrice}>
    מחיר נוכחי: {currentPrice} ₪
  </p>

  {/* הודעת סטטוס על ההצעות */}
  <p className={styles.lastBidInfo}>
    {!hasFirstBid
      ? "טרם הוגשה הצעה. היה/י הראשון/ה להגיש!"
      : (lastBidder === buyerId
          ? "נתת את ההצעה האחרונה!"
          : "ניתנה הצעה ממשתמש! לחץ הגש הצעה כדי לזכות!")}
  </p>

  {/* טיימר 15ש׳ – רק אחרי הצעה ראשונה */}
  {hasFirstBid && roundTimeLeft != null && (
    <>
      <div className={styles.timerBar}>
        <div
          className={styles.timerFill}
          style={{ width: `${(roundTimeLeft / 15) * 100}%` }}
        />
      </div>
      <p className={styles.timeText}>
        ⌛ זמן להגשת הצעה: {roundTimeLeft} שניות
      </p>
    </>
  )}

  {/* כפתור הגשה – טקסט משתנה לפני/אחרי ההצעה הראשונה */}
  <button
    className={styles.bidButton}
    disabled={!canBid}
    onClick={() => handleBid(Number(product.bid_increment))}
  >
    {hasFirstBid
      ? `הגש הצעה של +${product.bid_increment} ₪`
      : "הגש הצעה הראשונה"}
  </button>

  {/* טיימר כללי של המכירה */}
  {auctionTimeLeft != null && auctionTimeLeft > 0 && (
    <p className={styles.timeRemaining}>
      המכירה תסתיים בעוד {String(minutesLeft).padStart(2, "0")}:
      {String(secondsLeft).padStart(2, "0")} דקות
    </p>
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
