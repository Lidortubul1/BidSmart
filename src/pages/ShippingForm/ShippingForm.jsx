// /pages/ShippingForm.jsx
import { useParams } from "react-router-dom";
import { useState } from "react";

function ShippingForm() {
  const { id } = useParams(); // product_id
  console.log("🔍 מזהה מוצר מה-URL:", id); // בדקי מה יודפס כאן

  const [formData, setFormData] = useState({
    city: "",
    street: "",
    house_number: "",
    zip: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await fetch("http://localhost:5000/api/sale/update-address", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id: id, ...formData }),
    });

    alert("הכתובת נשלחה למוכר!");
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3>נא למלא כתובת למשלוח</h3>
      <input name="city" placeholder="עיר" onChange={handleChange} required />
      <input
        name="street"
        placeholder="רחוב"
        onChange={handleChange}
        required
      />
      <input
        name="house_number"
        placeholder="מספר בית"
        onChange={handleChange}
        required
      />
      <input name="zip" placeholder="מיקוד" onChange={handleChange} required />
      <button type="submit">שלח כתובת</button>
    </form>
  );
}

export default ShippingForm;
