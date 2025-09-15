// /src/pages/LiveAuction/LiveAuction.jsx
// ⚠️ פיצול ל־UI Components בלבד — ללא שינוי לוגיקה/סוקטים/סטייט.

import styles from "./LiveAuction.module.css";
import { useCallback, useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { useParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import CustomModal from "../../components/CustomModal/CustomModal.jsx";
import { getProductById } from "../../services/productApi.js";
import { createOrder } from "../../services/paymentApi.js";
import { endAuction } from "../../services/auctionApi";

// 👇 מייבא את תתי-הקומפוננטות מה־barrel
import {
  HeaderBar,
  Gallery,
  PreLivePanel,
  LivePanel,
  EndedPanel,
  ChatFeed,
} from "./components";

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
    ? `${d} ימים ${String(h).padStart(2, "0")}:${String(m).padStart(
        2,
        "0"
      )}:${String(s).padStart(2, "0")}`
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
  const [isLive, setIsLive] = useState(false);
  const [auctionEnded, setAuctionEnded] = useState(false);
  const [winnerId, setWinnerId] = useState(null);

  // קאונטדאונים
  const [startCountdown, setStartCountdown] = useState(null);
  const [auctionTimeLeft, setAuctionTimeLeft] = useState(null);
  const [roundTimeLeft, setRoundTimeLeft] = useState(null);

  // מצב הצעות
  const [currentPrice, setCurrentPrice] = useState(0);
  const [lastBidder, setLastBidder] = useState(null);
  const [canBid, setCanBid] = useState(true);

  // לוג צ'אט (אופציונלי)
  const [chatLog, setChatLog] = useState([]);
  const anonymizedUsers = useRef({});

  // נגזרות להצגת סטטוס/כפתור
  const openingPrice = Number(product?.price) || 0;
  const hasFirstBid = Number(currentPrice) > openingPrice || !!lastBidder;
  const isMyLastBid = lastBidder && String(lastBidder) === String(buyerId);
  const isBidDisabled = !isLive || auctionEnded || !canBid || isMyLastBid;

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

  // ✅ סיום מכירה – מוגדר פעם אחת עם useCallback בתוך הקומפוננטה
  const finishAuctionOnServer = useCallback(async () => {
    try {
      const data = await endAuction(productId);
      setWinnerId(data.winnerId || null);
      setCurrentPrice((prev) =>
        data.finalPrice != null ? Number(data.finalPrice) : prev
      );
      setAuctionEnded(true);
      setIsLive(false);
    } catch (err) {
      console.error("שגיאה בסיום מכירה:", err);
    }
  }, [productId]);

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
      const ended = data.winner_id_number != null || now >= endMs;

      // לייב רק אם is_live=1 וגם לא נגמרה
      const live = data.is_live === 1 && !ended;

      setIsLive(live);
      setAuctionEnded(ended);
      setWinnerId(data.winner_id_number || null);

      setCurrentPrice(Number(data.current_price) || 0);

      // נעדכן רק אם יש לנו זוכה (נגמר) או אם השרת מחזיר "מציע אחרון"
      const apiLastBidder =
        data.last_bidder_id_number ??
        data.lastBidderId ??
        data.last_bidder ??
        null;

      setLastBidder((prev) => {
        if (ended) return data.winner_id_number || prev; // בסוף מכירה – הזוכה
        return apiLastBidder ?? prev; // אחרת – נעדכן רק אם השרת סיפק מזהה
      });

      // לאפשר הצעות כברירת מחדל
      if (ended) setCanBid(false);

      // אם המכירה בלייב אבל טרם הייתה הצעה – לא מפעילים טיימר סבב
      if (data.is_live === 1 && !ended) {
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
    socket.emit("joinAuction", { productId });

    const onAuctionStarted = () => {
      setIsLive(true);
      setAuctionEnded(false);
      setStartCountdown(null);

      // לא מפעילים 15ש׳ לפני הצעה ראשונה
      setRoundTimeLeft(null);

      setAuctionTimeLeft((prev) => {
        if (!product) return prev;
        const startMs = new Date(product.start_date).getTime();
        const endMs = startMs + timeToSeconds(product.end_time) * 1000;
        return Math.max(Math.floor((endMs - Date.now()) / 1000), 0);
      });
    };

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

      // פותחים את הכפתור רק אם מישהו אחר הציע
      setCanBid(bidderId !== buyerId);

      const { name, color } = getAnon(bidderId);
      setChatLog((prev) => [
        ...prev,
        { text: `${name} הציע ${price} ₪`, color },
      ]);
    };

    socket.on("newBid", onNewBid);
    return () => socket.off("newBid", onNewBid);
  }, [buyerId]);

  // טיימר סבב 15 שניות – רק אחרי הצעה ראשונה
  useEffect(() => {
    if (!isLive || auctionEnded || !hasFirstBid) return;
    if (roundTimeLeft == null) return;
    if (roundTimeLeft <= 0) {
      finishAuctionOnServer();
      return;
    }
    const t = setInterval(() => setRoundTimeLeft((v) => v - 1), 1000);
    return () => clearInterval(t);
  }, [isLive, auctionEnded, hasFirstBid, roundTimeLeft, finishAuctionOnServer]);

  // קאונטדאון לתחילת מכירה
  useEffect(() => {
    if (isLive || startCountdown == null) return;

    if (startCountdown <= 0) {
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
          setAuctionTimeLeft(
            Math.max(Math.floor((endMs - Date.now()) / 1000), 0)
          );
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
  }, [auctionTimeLeft, auctionEnded, finishAuctionOnServer]);

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

  function handleBid(amount = 10) {
    if (!isLive || auctionEnded || !canBid) return;
    // נועלים מיידית ומסמנים שההצעה האחרונה שלי (אופטימית)
    setCanBid(false);
    setLastBidder(buyerId);
    socket.emit("placeBid", { productId, buyerId, customAmount: amount });
  }

  if (!product) return <p className={styles.loading}>טוען מוצר...</p>;

  // חישוב שעון כללי להצגה בכותרת/מרכז
  const minutesLeft =
    auctionTimeLeft != null ? Math.floor(auctionTimeLeft / 60) : null;
  const secondsLeft =
    auctionTimeLeft != null ? auctionTimeLeft % 60 : null;

  // פעולה לפתיחת מודאל תשלום לזוכה (נשאר כמו קודם)
  const openPayModal = async () => {
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
  };

  // -------- UI מפוצל לתת־קומפוננטות --------
  // במקום שלושה returns גדולים, נחזיר Grid אחד עם מרכז משתנה לפי מצב
return (
  <div className={styles.container} dir="rtl">
    <div className={styles.cardWrapper}>
      <HeaderBar
        productName={product.product_name}
        isLive={isLive}
        auctionEnded={auctionEnded}
        currentPrice={currentPrice}
        minutesLeft={minutesLeft}
        secondsLeft={secondsLeft}
      />

      <div className={styles.cardGrid}>
        {/* שמאל: פרטי מוצר + גלריה */}
        <Gallery
          description={product.description}
          images={product.images}
        />

        {/* מרכז: משתנה לפי מצב */}
        {!isLive && !auctionEnded && (
          <PreLivePanel
            startText={
              product.start_date
                ? formatDateAndTime(product.start_date)
                : "תאריך לא זמין"
            }
            countdown={startCountdown != null ? fmtHMS(startCountdown) : null}
          />
        )}

        {isLive && !auctionEnded && (
          <LivePanel
            hasFirstBid={hasFirstBid}
            isMyLastBid={isMyLastBid}
            isBidDisabled={isBidDisabled}
            roundTimeLeft={roundTimeLeft}
            bidIncrement={product.bid_increment}
            onBid={() => handleBid(Number(product.bid_increment))}
            minutesLeft={minutesLeft}
            secondsLeft={secondsLeft}
          />
        )}

      {auctionEnded && (
  <EndedPanel
    isWinner={buyerId === winnerId}
    currentPrice={currentPrice}
    onPayClick={openPayModal}
    isForSale={product?.status === "for sale"}   // ← חדש
  />
)}

        {/* ימין: פיד ההצעות */}
        <ChatFeed chatLog={chatLog} />
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
  </div>
);

}

export default LiveAuction;
