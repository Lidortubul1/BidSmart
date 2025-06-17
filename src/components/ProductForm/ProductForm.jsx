import { useState, useEffect } from "react";
import { fetchCategories } from "../../services/categoriesApi";
import styles from "./ProductForm.module.css";
import CustomModal from "../CustomModal/CustomModal"; // ייבוא הקומפוננטה

function ProductForm({ onSubmit }) {
  const [formData, setFormData] = useState({
    product_name: "",
    start_date: "",
    start_time: "",
    end_date: "",
    price: "",
    image: "",
    description: "",
  });

  const [categories, setCategories] = useState({});
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: "",
    message: "",
    confirmText: "",
    onConfirm: null,
    onCancel: null,
  });

  const openModal = ({ title, message, confirmText = "סגור" }) => {
    setModalConfig({
      title,
      message,
      confirmText,
      onConfirm: () => setShowModal(false),
      onCancel: () => setShowModal(false),
    });
    setShowModal(true);
  };

  useEffect(() => {
    async function loadCategories() {
      try {
        const data = await fetchCategories();
        setCategories(data);
      } catch (error) {
        console.error("שגיאה בטעינת קטגוריות:", error);
      }
    }

    loadCategories();
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
      openModal({
        title: "שגיאה",
        message: "נא למלא את כל שדות החובה כולל קטגוריה ותת קטגוריה",
      });
      return;
    }

    if (new Date(end_date) <= new Date(start_date)) {
      openModal({
        title: "תאריכים לא תקינים",
        message: "תאריך סיום חייב להיות אחרי תאריך התחלה",
      });
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
    <>
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
          שעת התחלה *
          <input
            type="time"
            name="start_time"
            value={formData.start_time}
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
            type="file"
            name="images"
            multiple
            accept="image/*"
            onChange={(e) =>
              setFormData({ ...formData, images: e.target.files })
            }
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
            required
          >
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

      {showModal && (
        <CustomModal
          title={modalConfig.title}
          message={modalConfig.message}
          confirmText={modalConfig.confirmText}
          onConfirm={modalConfig.onConfirm}
          cancelText={modalConfig.cancelText}
          onCancel={modalConfig.onCancel}
        />
      )}
    </>
  );
}

export default ProductForm;
