// /payment-success/:productId?token=ORDER_ID
import { useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import axios from "axios";

export default function PaymentSuccess() {
  const { productId } = useParams();
  const [searchParams] = useSearchParams();
  const orderID = searchParams.get("token");

  useEffect(() => {
    async function confirmPayment() {
      try {
        const res = await axios.post(
          "http://localhost:5000/api/payment/capture-order",
          {
            orderID,
            product_id: productId,
          }
        );
        console.log("✅ התשלום אושר:", res.data);
        // פה תוכל להפנות לדף איסוף או הזנת משלוח
      } catch (err) {
        console.error("❌ שגיאה באישור תשלום:", err);
      }
    }

    if (orderID && productId) {
      confirmPayment();
    }
  }, [orderID, productId]);

  return <p>מאשר את התשלום שלך... ⏳</p>;
}
