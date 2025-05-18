import { useState, useEffect } from "react";
import axios from "axios";
import styles from "./ProductForm.module.css";

function ProductForm({ onSubmit }) {
  const [formData, setFormData] = useState({
    product_name: "",
    start_date: "",
    end_date: "",
    price: "",
    image: "",
    description: "",
  });

  const [categories, setCategories] = useState({});
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await axios.get("http://localhost:5000/api/categories");
        setCategories(res.data);
      } catch (error) {
        console.error("שגיאה בטעינת קטגוריות:", error);
      }
    }

    fetchCategories();
  }, []);

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
    if (
      !product_name ||
      !start_date ||
      !end_date ||
      !price ||
      !selectedCategory ||
      !selectedSubCategory
    ) {
      alert("נא למלא את כל שדות החובה כולל קטגוריה ותת קטגוריה");
      return;
    }

    if (new Date(end_date) <= new Date(start_date)) {
      alert("תאריך סיום חייב להיות אחרי תאריך התחלה");
      return;
    }

    const preparedData = {
      ...formData,
      price: parseFloat(formData.price),
      category: selectedCategory,
      sub_category: selectedSubCategory, 
    };

    onSubmit(preparedData);
  };
  

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h2 className={styles.title}> הוספת מוצר חדש</h2>

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
        כתובת תמונה
        <input
          type="text"
          name="image"
          value={formData.image}
          onChange={handleChange}
        />
      </label>

      <label>
        תיאור
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
        />
      </label>

      <label>
        קטגוריה *
        <select
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value);
            setSelectedSubCategory("");
          }}
          required >
          <option value="">בחר קטגוריה</option>
          {Object.keys(categories).map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </label>

      {selectedCategory && (
        <label>
          תת קטגוריה *
          <select
            value={selectedSubCategory}
            onChange={(e) => setSelectedSubCategory(e.target.value)}
            required
          >
            <option value="">בחר תת קטגוריה</option>
            {categories[selectedCategory].map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>
        </label>
      )}

      <button type="submit" className={styles.submitButton}>
         שמור מוצר
      </button>
    </form>
  );
}

export default ProductForm;
