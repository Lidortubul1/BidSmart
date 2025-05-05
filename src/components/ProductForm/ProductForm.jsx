import { useState } from "react";
import styles from "./ProductForm.module.css";

function ProductForm({ onSubmit }) {
  const [formData, setFormData] = useState({
    product_name: "",
    start_date: "",
    end_date: "",
    price: "",
    image: "",
    description: "",
    category: "",
  });   

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

 const handleSubmit = (e) => {
   e.preventDefault();

   const { product_name, start_date, end_date, price } = formData;

   // בדיקת שדות חובה
   if (!product_name || !start_date || !end_date || !price) {
     alert("נא למלא את כל שדות החובה");
     return;
   }

   // בדיקת תוקף תאריכים
   const start = new Date(start_date);
   const end = new Date(end_date);

   if (end <= start) {
     alert("תאריך סיום חייב להיות אחרי תאריך התחלה");
     return;
   }

   // המרת מחיר למספר
   const preparedData = {
     ...formData,
     price: parseFloat(formData.price),
   };

   onSubmit(preparedData);
 };


  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h2 className={styles.title}>🛍️ הוספת מוצר חדש</h2>

      <label>
        שם המוצר *
        <input
          type="text"
          name="product_name"
          value={formData.product_name}
          onChange={handleChange}
          required
        />
      </label>

      <label>
        תאריך התחלה *
        <input
          type="date"
          name="start_date"
          value={formData.start_date}
          onChange={handleChange}
          required
        />
      </label>

      <label>
        תאריך סיום *
        <input
          type="date"
          name="end_date"
          value={formData.end_date}
          onChange={handleChange}
          required
        />
      </label>

      <label>
        מחיר פתיחה *
        <input
          type="number"
          step="0.01"
          name="price"
          value={formData.price}
          onChange={handleChange}
          required
        />
      </label>

      <label>
        כתובת תמונה (לא חובה)
        <input
          type="text"
          name="image"
          value={formData.image}
          onChange={handleChange}
        />
      </label>

      <label>
        תיאור המוצר
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
        />
      </label>

      <label>
        קטגוריה
        <input
          type="text"
          name="category"
          value={formData.category}
          onChange={handleChange}
        />
      </label>

      <button type="submit" className={styles.submitButton}>
        💾 שמור מוצר
      </button>
    </form>
  );
}

export default ProductForm;
