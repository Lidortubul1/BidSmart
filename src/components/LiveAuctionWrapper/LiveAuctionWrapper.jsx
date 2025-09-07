// LiveAuctionWrapper.jsx
// מעטפת למכירה חיה: בודקת אם המשתמש מחובר עם ת"ז, אחרת מציגה הודעת התחברות. אם כן — שולחת productId ו־buyerId לקומפוננטת LiveAuction.

import { useParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import LiveAuction from "../LiveAuction/LiveAuction";

export default function LiveAuctionWrapper() {
  const { id } = useParams();
  const { user } = useAuth();

  if (!user?.id_number) return <p>יש להתחבר כדי להשתתף במכירה</p>;

  return <LiveAuction productId={parseInt(id)} buyerId={user.id_number} />;
}
