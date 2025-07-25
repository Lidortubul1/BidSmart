import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  getProductById,
  updateProduct,
  deleteProductImage,
  addProductImage,
} from "../../services/adminProductsApi";
import {
  fetchCategories,
  fetchSubcategories,
} from "../../services/adminCategoryApi";
import styles from "./AdminProductCard.module.css";
import CustomModal from "../CustomModal/CustomModal";

export default function AdminProductDetails() {
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [edited, setEdited] = useState({});
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null); // תמונה נבחרת להגדלה
  const [modal, setModal] = useState(null); // ל־CustomModal

  async function handleAddImage(e) {
    const file = e.target.files[0];
    if (!file) return;
    await addProductImage(productId, file); // שולח לשרת
    getProductById(productId).then(setProduct); // רענון התמונות
    e.target.value = "";
    setModal({
      type: "success",
      message: "התמונה נוספה בהצלחה!",
    });
    setTimeout(() => setModal(null), 2000);
  }

  useEffect(() => {
    fetchCategories().then(setCategories);
  }, []);

  useEffect(() => {
    getProductById(productId).then((prod) => {
      setProduct(prod);
      const catId = prod.category_id;
      if (catId) fetchSubcategories(catId).then(setSubcategories);
    });
  }, [productId]);

  function handleChange(e) {
    setEdited({ ...edited, [e.target.name]: e.target.value });
  }

  function handleCategoryChange(e) {
    const category_id = e.target.value;
    setEdited({ ...edited, category_id, subcategory_id: "" });
    fetchSubcategories(category_id).then(setSubcategories);
  }

  async function handleSave() {
    setSaving(true);
    await updateProduct(productId, edited);
    getProductById(productId).then(setProduct);
    setEdited({});
    setSaving(false);

    // הודעה קופצת - הצלחה
    setModal({
      type: "success",
      message: "הנתונים נשמרו בהצלחה!",
    });
    setTimeout(() => setModal(null), 2000);
  }

  // פותח מודאל אישור מחיקה
  function askDeleteImage(image_url) {
    setModal({
      type: "delete",
      message: "האם למחוק תמונה זו?",
      image_url,
    });
  }

  // מאשר מחיקה
  async function confirmDeleteImage() {
    await deleteProductImage(productId, modal.image_url);
    getProductById(productId).then(setProduct);
    setModal({
      type: "success",
      message: "התמונה נמחקה!",
    });
    setTimeout(() => setModal(null), 2000);
  }

  if (!product) return <div className={styles.detailsPage}>טוען...</div>;

  return (
    <div className={styles.detailsPage}>
      <h2>פרטי מוצר</h2>
      <div className={styles.formRow}>
        <label>שם</label>
        <input
          name="product_name"
          value={edited.product_name ?? product.product_name}
          onChange={handleChange}
        />
      </div>
      <div className={styles.formRow}>
        <label>קטגוריה</label>
        <select
          name="category_id"
          value={edited.category_id ?? product.category_id}
          onChange={handleCategoryChange}
        >
          <option value="">בחר קטגוריה</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.formRow}>
        <label>תת קטגוריה</label>
        <select
          name="subcategory_id"
          value={edited.subcategory_id ?? product.subcategory_id}
          onChange={(e) =>
            setEdited({ ...edited, subcategory_id: e.target.value })
          }
          disabled={!edited.category_id && !product.category_id}
        >
          <option value="">בחר תת קטגוריה</option>
          {subcategories.map((sub) => (
            <option key={sub.id} value={sub.id}>
              {sub.name}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.formRow}>
        <label>סטטוס</label>
        <input
          name="product_status"
          value={edited.product_status ?? product.product_status}
          onChange={handleChange}
        />
      </div>
      <div className={styles.formRow}>
        <label>מוכר</label>
        <input
          name="seller_name"
          value={edited.seller_name ?? product.seller_name}
          onChange={handleChange}
        />
      </div>
      <div className={styles.formRow}>
        <label>מחיר אחרון</label>
        <input
          name="current_price"
          value={edited.current_price ?? product.current_price}
          onChange={handleChange}
          type="number"
        />
      </div>
      <div className={styles.formRow}>
        <label>תיאור</label>
        <textarea
          name="description"
          value={edited.description ?? product.description}
          onChange={handleChange}
        />
      </div>
      <div className={styles.formRow}>
        <label>תאריך התחלה</label>
        <input
          name="start_date"
          value={
            edited.start_date ??
            (product.start_date ? product.start_date.slice(0, 10) : "")
          }
          onChange={handleChange}
          type="date"
        />
      </div>
      <div className={styles.formRow}>
        <label>שעת התחלה</label>
        <input
          name="start_time"
          value={edited.start_time ?? product.start_time}
          onChange={handleChange}
          type="time"
        />
      </div>
      <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
        {saving ? "שומר..." : "שמור שינויים"}
      </button>

      {/* תמונות */}
      <div style={{ marginTop: 32 }}>
        {/* העלאת תמונה */}
        <label className={styles.addImgLabel} style={{ cursor: "pointer" }}>
          <span style={{ marginLeft: 8 }}>העלה תמונה</span>
          <input
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleAddImage}
          />
        </label>

        <h4 style={{ fontWeight: 600, marginBottom: 12 }}>תמונות מוצר:</h4>
        {product.images?.length > 0 ? (
          <div className={styles.imagesGrid}>
            {product.images.map((img, idx) => (
              <div key={idx} className={styles.imageItem}>
                <img
                  src={`http://localhost:5000${img.image_url || img}`}
                  alt=""
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    setSelectedImage(
                      `http://localhost:5000${img.image_url || img}`
                    );
                    setModal({ type: "image" });
                  }}
                />
                <button
                  className={styles.deleteImgBtn}
                  onClick={() => askDeleteImage(img.image_url || img)}
                  title="מחק תמונה"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: "#aaa", fontSize: "1rem" }}>אין תמונות</div>
        )}
      </div>

      {/* --- כל החלונות הקופצים כאן --- */}
      {modal?.type === "image" && (
        <CustomModal
          title="תצוגה מוגדלת"
          message={
            <div style={{ textAlign: "center" }}>
              <img
                src={selectedImage}
                alt=""
                style={{
                  display: "block",
                  maxWidth: "100%",
                  maxHeight: "50vh",
                  margin: "0 auto",
                  borderRadius: 18,
                  border: "3px solid #fff",
                  boxShadow: "0 6px 40px #0004",
                  background: "#fff",
                }}
              />
            </div>
          }
          confirmText="סגור"
          onConfirm={() => {
            setSelectedImage(null);
            setModal(null);
          }}
        />
      )}

      {modal?.type === "delete" && (
        <CustomModal
          title="מחיקת תמונה"
          message={modal.message}
          confirmText="מחק"
          cancelText="ביטול"
          onConfirm={confirmDeleteImage}
          onCancel={() => setModal(null)}
        />
      )}

      {modal?.type === "success" && (
        <CustomModal title="✔" message={modal.message} />
      )}
    </div>
  );
}
