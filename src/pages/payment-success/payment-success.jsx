// PaymentSuccess.jsx
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

function PaymentSuccess() {
  const { id } = useParams(); // שליפת מזהה המוצר מה-URL (לדוגמה: /payment-success/12)

  const navigate = useNavigate();

  useEffect(() => {
    // ברגע שהרכיב עולה, אנו מאשרים את התשלום לשרת וממשיכים
    async function finalizeSale() {
      try {
        // שליחת product_id לשרת לצורך אישור וסיום העסקה
        const res = await fetch("http://localhost:5000/api/payment/confirm", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ product_id: id }), // שימו לב: id נשלח מה-URL
        });

        const data = await res.json();

        if (data.success) {
          console.log("✅ התשלום אושר, ממשיכים למסך משלוח");
          // הפניה לדף שבו המשתמש בוחר אם לבצע משלוח או איסוף עצמי
          navigate(`/delivery-choice/${id}`);
        } else {
          console.error("❌ אישור התשלום נכשל בשרת");
        }
      } catch (err) {
        console.error("❌ שגיאה באישור תשלום:", err);
      }
    }

    if (id) {
      finalizeSale();
    } else {
      console.error("❌ לא נמצא product_id בכתובת ה-URL");
    }
  }, [id]);

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h2>✔️ תודה על התשלום!</h2>
      <p>מעבד את ההזמנה שלך...</p>
    </div>
  );
}

export default PaymentSuccess;
