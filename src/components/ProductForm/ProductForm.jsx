//src\components\ProductForm\ProductForm.jsx
// טופס הוספת מוצר: בחירת שם/תאריך+שעת התחלה (מאוחדים ל-start_date), משך מכירה (end_time), מחיר ו־VAT, סכום קפיצת הצעה, תיאור, קטגוריה/תת־קטגוריה והעלאת תמונות; ולידציה בסיסית והעברתו ל-onSubmit בפורמט מוכן למסד.

import { useState, useEffect } from "react";
import { fetchCategoriesWithSubs } from "../../services/categoriesApi";
import CustomModal from "../CustomModal/CustomModal";
import styles from "./ProductForm.module.css";

function ProductForm({ onSubmit }) {
  const [formData, setFormData] = useState({
    product_name: "",
    start_date: "",
    end_time: "00:10:00",
    price: "",
    description: "",
    bid_increment: 10,
  });

  const [vatIncluded, setVatIncluded] = useState(true);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [startTime, setStartTime] = useState(""); // השדה היחיד שמשמש לשעה

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
        const data = await fetchCategoriesWithSubs();
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

  const { product_name, start_date, end_time, price } = formData;
  console.log(formData)
  if (
    !product_name ||
    !start_date ||
    !startTime ||        // שעת התחלה חייבת
    !end_time ||         // משך מכירה חייב
    !price ||
    !selectedCategory ||
    !selectedSubCategory
  ) {
    openModal({
      title: "שגיאה",
      message: "נא למלא את כל שדות החובה כולל שעת התחלה, קטגוריות ומשך מכירה",
    });
    return;
  }

  const combinedStartDate = `${start_date}T${startTime}`;

  const preparedData = {
    ...formData,
    start_date: combinedStartDate,          // DATETIME מלא
    price: parseFloat(price),
    vat_included: vatIncluded.toString(),
    category_id: selectedCategory,
    subcategory_id: selectedSubCategory,
  };

  onSubmit(preparedData);
};


  return (
    <>
      <div className={styles.page}>
        <form className={styles.form} onSubmit={handleSubmit}>
          <h2 className={styles.title}>הוספת מוצר חדש</h2>

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
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </label>

          <label htmlFor="end_time">משך מכירה *</label>
            <select
              id="end_time"
              name="end_time"
              value={formData.end_time}
              onChange={handleChange}
              required>
          <option value="">בחר משך</option>
          <option value="00:10:00">10 דקות</option>
          <option value="00:15:00">15 דקות</option>
          <option value="00:20:00">20 דקות</option>
          <option value="00:30:00">חצי שעה</option>
          <option value="01:00:00">שעה</option>
            </select>
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

          <fieldset className={styles.vatBox}>
            <legend>כיצד הוזן המחיר?</legend>
            <label>
              <input
                type="radio"
                name="vat_included"
                value="true"
                checked={vatIncluded === true}
                onChange={() => setVatIncluded(true)}
              />
              מחיר כולל מע"מ
            </label>
            <label>
              <input
                type="radio"
                name="vat_included"
                value="false"
                checked={vatIncluded === false}
                onChange={() => setVatIncluded(false)}
              />
              מחיר לפני מע"מ (יוצג כולל מע"מ ללקוח)
            </label>
          </fieldset>

          <label>
            תמונות מוצר
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

          <label htmlFor="bid_increment">בחר את סכום העלאת ההצעה:</label>
          <select
            id="bid_increment"
            name="bid_increment"
            value={formData.bid_increment}
            onChange={handleChange}
          >
            <option value="10">10 ש"ח</option>
            <option value="50">50 ש"ח</option>
            <option value="100">100 ש"ח</option>
            <option value="500">500 ש"ח</option>
            <option value="1000">1000 ש"ח</option>
          </select>

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
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
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
                {(categories.find((cat) => cat.id == selectedCategory)
                  ?.subcategories || []
                ).map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <button type="submit" className={styles.submitButton}>
            שמור מוצר
          </button>
        </form>
      </div>

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
