// src/components/LiveAuctionWrapper/LiveAuctionWrapper.jsx
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import LiveAuction from "../LiveAuction/LiveAuction";
import { isUserRegistered } from "../../services/quotationApi";

export default function LiveAuctionWrapper() {
  const { id } = useParams();
  const productId = Number(id);
  const { user } = useAuth();

  const [checking, setChecking] = useState(true);
  const [registered, setRegistered] = useState(false);

  // האם בכלל צריך לבדוק הרשמה (רק אם מחובר ויש ת"ז)
  const shouldCheckRegistration = !!(user?.email && user?.id_number);

  // תמיד נריץ useEffect (Top-level), ובתוך הגוף נחליט אם לבדוק או לא
  useEffect(() => {
    let alive = true;

    (async () => {
      // אם אין צורך לבדוק (לא מחובר/אין ת"ז) — נפסיק לבדיקה ונציב registered=false
      if (!shouldCheckRegistration) {
        if (alive) {
          setRegistered(false);
          setChecking(false);
        }
        return;
      }

      // יש צורך לבדוק
      try {
        if (alive) setChecking(true);
        const ok = await isUserRegistered(productId, user.id_number);
        if (alive) setRegistered(!!ok);
      } catch {
        if (alive) setRegistered(false);
      } finally {
        if (alive) setChecking(false);
      }
    })();

    return () => { alive = false; };
  }, [shouldCheckRegistration, productId, user?.id_number]);

  // ----- רינדור -----

  // לא מחובר
  if (!user?.email) {
    return (
      <div style={{ padding: 200, textAlign: "right", direction: "rtl" }}>
        <p style={{ marginBottom: 8 }}>יש להתחבר כדי להשתתף במכירה.</p>
        <p>לאחר ההתחברות, יש להירשם למוצר בדף המוצר.</p>
        <Link to={`/product/${productId}`} style={{ textDecoration: "underline" }}>
          חזרה לדף המוצר
        </Link>
      </div>
    );
  }

  // מחובר בלי ת״ז
  if (!user?.id_number) {
    return (
      <div style={{ padding: 200, textAlign: "right", direction: "rtl" }}>
        <p style={{ marginBottom: 8 }}>
          לצורך השתתפות במכירה יש להשלים ת״ז וצילום ת״ז ולהירשם למוצר.
        </p>
        <Link to={`/product/${productId}`} style={{ textDecoration: "underline" }}>
          לעמוד המוצר להרשמה
        </Link>
      </div>
    );
  }

  // בודק הרשמה
  if (checking) {
    return (
      <div style={{ padding: 200, textAlign: "right", direction: "rtl" }}>
        <p>בודק הרשמה למוצר…</p>
      </div>
    );
  }

  // לא רשום למוצר
  if (!registered) {
    return (
      <div style={{ padding: 200, textAlign: "right", direction: "rtl" }}>
        <p style={{ marginBottom: 8 }}>עלייך להירשם למוצר לפני ההשתתפות במכירה.</p>
        <Link to={`/product/${productId}`} style={{ textDecoration: "underline" }}>
          חזרה לדף המוצר להרשמה
        </Link>
      </div>
    );
  }

  // רשום — נכנסים ל־Live
  return <LiveAuction productId={productId} buyerId={user.id_number} />;
}
