import { useState } from "react";
import { addProduct } from "../../services/api";
import styles from "./AddProductPage.module.css";

function AddProductPage() {
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const product = {
      product_name: formData.get("product_name"),
      start_date: formData.get("start_date"),
      end_date: formData.get("end_date"),
      price: parseFloat(formData.get("price")),
      image: formData.get("image"),
      description: formData.get("description"),
      seller_id_number: formData.get("seller_id_number"),
      product_status: formData.get("product_status"),
      category: formData.get("category"),
    };

    try {
      await addProduct(product);
      setMessage("המוצר נוסף בהצלחה!");
      e.target.reset(); // ניקוי הטופס
    } catch {
      setMessage("הייתה שגיאה בהוספה");
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>הוספת מוצר חדש</h2>
      <form className={styles.form} onSubmit={handleSubmit}>
        <input name="product_name" placeholder="שם מוצר" required />
        <input name="start_date" type="date" required />
        <input name="end_date" type="date" required />
        <input name="price" type="number" placeholder="מחיר פתיחה" required />
        <input name="image" placeholder="קישור לתמונה" />
        <input name="description" placeholder="תיאור המוצר" />
        <input
          name="seller_id_number"
          placeholder="תעודת זהות של המוכר"
          required
        />
        <select name="product_status" required>
          <option value="">בחר מצב</option>
          <option value="new">חדש</option>
          <option value="used">משומש</option>
        </select>
        <input name="category" placeholder="קטגוריה " />

        <button type="submit">הוסף מוצר</button>
      </form>

      {message && <p>{message}</p>}
    </div>
  );
}

export default AddProductPage;
