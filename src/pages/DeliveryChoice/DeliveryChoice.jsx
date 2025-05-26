// /pages/DeliveryChoice.jsx
import { useNavigate, useParams } from "react-router-dom";
import { useEffect } from "react";

function DeliveryChoice() {
  const navigate = useNavigate();
  const { productId } = useParams(); // זה צריך להיות בדיוק כמו בנתיב שלך

  useEffect(() => {
    if (!productId || productId === "undefined") {
      console.warn("❌ מזהה מוצר לא תקין:", productId);
      return;
    }
  }, [productId]);

  const handleShipping = () => {
    if (productId) navigate(`/shipping/${productId}`);
  };

  const handlePickup = () => {
    if (productId) navigate(`/pickup-info/${productId}`);
  };

  return (
    <div>
      <h2>כיצד תרצה לקבל את המוצר?</h2>
      <button onClick={handleShipping}>משלוח</button>
      <button onClick={handlePickup}>איסוף עצמי</button>
    </div>
  );
}

export default DeliveryChoice;
