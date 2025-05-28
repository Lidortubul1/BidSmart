import { useParams } from "react-router-dom";
import { useState } from "react";
import citiesData from "../../assets/data/cities_with_streets.json";

function ShippingForm() {
  const { id } = useParams(); // מזהה מוצר

  const [selectedCity, setSelectedCity] = useState("");
  const [availableStreets, setAvailableStreets] = useState([]);

  // אובייקט נתוני הטופס כולל מספר דירה
  const [formData, setFormData] = useState({
    city: "",
    street: "",
    house_number: "",
    apartment_number: "",
    zip: "",
  });

  // כאשר העיר משתנה, עדכן את הרחובות
  const handleCityChange = (e) => {
    const selected = e.target.value;
    setSelectedCity(selected);
    const cityObj = citiesData.find((c) => c.city === selected);
    setAvailableStreets(cityObj ? cityObj.streets : []);
    setFormData({ ...formData, city: selected, street: "" });
  };

  // עדכון כל שדה אחר
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // שליחת הנתונים לשרת
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

      <select
        name="city"
        value={formData.city}
        onChange={handleCityChange}
        required
      >
        <option value="">בחר עיר</option>
        {citiesData.map((c, i) => (
          <option key={i} value={c.city}>
            {c.city}
          </option>
        ))}
      </select>

      <select
        name="street"
        value={formData.street}
        onChange={handleChange}
        required
      >
        <option value="">בחר רחוב</option>
        {availableStreets.map((street, i) => (
          <option key={i} value={street}>
            {street}
          </option>
        ))}
      </select>

      <input
        name="house_number"
        placeholder="מספר בית"
        onChange={handleChange}
        required
      />

      <input
        name="apartment_number"
        placeholder="מספר דירה"
        onChange={handleChange}
      />

      <input name="zip" placeholder="מיקוד" onChange={handleChange} required />

      <button type="submit">שלח כתובת</button>
    </form>
  );
}

export default ShippingForm;
