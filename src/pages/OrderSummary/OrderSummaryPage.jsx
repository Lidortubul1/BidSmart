// OrderSummaryPage.jsx - כולל שליחת טופס ושיוך ל-PayPal
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styles from "./OrderSummaryPage.module.css";
import { useAuth } from "../../auth/AuthContext";

function OrderSummaryPage() {
  const { user } = useAuth();
  const { productId } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [shippingMethod, setShippingMethod] = useState("pickup");
  const [address, setAddress] = useState({ city: "", street: "", zip: "" });
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      setFullName(`${user.first_name || ""} ${user.last_name || ""}`.trim());
      setPhone(user.phone || "");
      setAddress({
        city: user.city || "",
        street: user.street || "",
        zip: user.zip || "",
      });
    }
  }, [user]);

  useEffect(() => {
    fetch(`http://localhost:5000/api/product/${productId}`)
      .then((res) => res.json())
      .then((data) => setProduct(data))
      .catch(() => setError("שגיאה בטעינת פרטי המוצר"));
  }, [productId]);

  const validate = () => {
    if (shippingMethod === "shipping") {
      if (!address.city || !address.street || !address.zip) {
        return "נא למלא את כל שדות הכתובת למשלוח";
      }
    }
    if (note.length > 200) return "הערות מוגבלות ל-200 תווים";
    return "";
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) return setError(validationError);
    setError("");

    console.log("📦 שולח לשרת את פרטי ההזמנה:", {
      product_id: productId,
      full_name: fullName,
      phone,
      shipping_method: shippingMethod,
      note,
      ...address,
    });

    try {
      const res = await fetch(
        "http://localhost:5000/api/sale/save-order-summary",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            product_id: productId,
            full_name: fullName,
            phone,
            shipping_method: shippingMethod,
            note,
            ...address,
          }),
        }
      );
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      window.location.href = data.paypalUrl;
    } catch (err) {
      console.error("❌ שגיאה בהזמנה:", err);
      setError(err.message || "שגיאה בשליחה לשרת");
    }
  };

  if (!product) return <p>טוען פרטי מוצר...</p>;

  const price = Number(product.current_price || product.price || 0);
  const priceNoVAT = (price / 1.17).toFixed(2);
  const vat = (price - priceNoVAT).toFixed(2);

  return (
    <div className={styles.wrapper}>
      <h2>סיכום הזמנה עבור {product.product_name}</h2>

      <label>שם מלא</label>
      <input value={fullName} onChange={(e) => setFullName(e.target.value)} />

      <label>מספר טלפון</label>
      <input value={phone} onChange={(e) => setPhone(e.target.value)} />

      <label>שיטת משלוח</label>
      <select
        value={shippingMethod}
        onChange={(e) => setShippingMethod(e.target.value)}
      >
        <option value="pickup">איסוף עצמי</option>
        <option value="shipping">דואר רשום</option>
      </select>

      {shippingMethod === "shipping" && (
        <>
          <label>עיר</label>
          <input
            value={address.city}
            onChange={(e) => setAddress({ ...address, city: e.target.value })}
          />

          <label>רחוב</label>
          <input
            value={address.street}
            onChange={(e) => setAddress({ ...address, street: e.target.value })}
          />

          <label>מיקוד</label>
          <input
            value={address.zip}
            onChange={(e) => setAddress({ ...address, zip: e.target.value })}
          />
        </>
      )}

      <label>הערות להזמנה (עד 200 תווים)</label>
      <textarea
        value={note}
        maxLength={200}
        onChange={(e) => setNote(e.target.value)}
      />

      <div className={styles.summaryBox}>
        <p>מחיר לפני מע"מ: {priceNoVAT} ₪</p>
        <p>מע"מ (17%): {vat} ₪</p>
        <p>
          <strong>סה"כ לתשלום: {price.toFixed(2)} ₪</strong>
        </p>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <button onClick={handleSubmit}>עבור לתשלום</button>
    </div>
  );
}

export default OrderSummaryPage;
