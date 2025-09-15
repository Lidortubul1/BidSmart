//src/pages/AdminCategories/AdminCategories.jsx
import { useEffect, useState } from "react";
import styles from "./AdminCategories.module.css";
import {
  fetchCategories,
  fetchSubcategories,
  addCategory,
  addSubcategory,
  deleteCategory,
  deleteSubcategory,
} from "../../services/adminCategoryApi";
import CustomModal from "../../components/CustomModal/CustomModal";

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState("");
  const [expanded, setExpanded] = useState({});
  const [subcategories, setSubcategories] = useState({});
  const [newSub, setNewSub] = useState({});

  // --- State להודעת modal ---
  const [modalOpen, setModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: "",
    message: "",
    confirmText: "סגור",
    onConfirm: () => setModalOpen(false),
  });

  function openModal({ title, message, confirmText = "סגור", onConfirm }) {
    setModalConfig({
      title,
      message,
      confirmText,
      onConfirm: () => {
        setModalOpen(false);
        onConfirm && onConfirm();
      },
    });
    setModalOpen(true);
  }

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    const data = await fetchCategories();
    setCategories(data);
  }

  async function handleExpand(id) {
    if (!subcategories[id]) {
      const subs = await fetchSubcategories(id);
      setSubcategories((prev) => ({ ...prev, [id]: subs }));
    }
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  // הוספת קטגוריה
  async function handleAddCategory() {
    if (!newCategory.trim()) return;

    const exists = categories.some(
      (cat) => cat.name.trim().toLowerCase() === newCategory.trim().toLowerCase()
    );
    if (exists) {
      openModal({
        title: "שגיאה",
        message: "כבר קיימת קטגוריה בשם הזה",
      });
      return;
    }

    const category = await addCategory(newCategory);
    const createdName = newCategory; // לשימוש אחרי reset
    setNewCategory("");

    if (category && category.id) {
      await addSubcategory("אחר", category.id);
    } else {
      await loadCategories();
      const updatedCategories = await fetchCategories();
      const newCat = updatedCategories.find((cat) => cat.name === createdName);
      if (newCat) {
        await addSubcategory("אחר", newCat.id);
      }
    }
    await loadCategories();
  }

  // הוספת תת-קטגוריה
  async function handleAddSubcategory(categoryId) {
    const name = newSub[categoryId];
    if (!name || !name.trim()) return;

    const exists = (subcategories[categoryId] || []).some(
      (sub) => sub.name.trim().toLowerCase() === name.trim().toLowerCase()
    );
    if (exists) {
      openModal({
        title: "שגיאה",
        message: "כבר קיימת תת־קטגוריה בשם הזה בקטגוריה הזו",
      });
      return;
    }

    await addSubcategory(name, categoryId);
    setNewSub((prev) => ({ ...prev, [categoryId]: "" }));
    const subs = await fetchSubcategories(categoryId);
    setSubcategories((prev) => ({ ...prev, [categoryId]: subs }));
  }

  async function handleDeleteCategory(id) {
    openModal({
      title: "אישור מחיקה",
      message: "למחוק את הקטגוריה?",
      confirmText: "מחק",
      onConfirm: async () => {
        await deleteCategory(id);
        loadCategories();
      },
    });
  }

  async function handleDeleteSubcategory(subId, categoryId) {
    openModal({
      title: "אישור מחיקה",
      message: "למחוק את תת־הקטגוריה?",
      confirmText: "מחק",
      onConfirm: async () => {
        await deleteSubcategory(subId);
        const subs = await fetchSubcategories(categoryId);
        setSubcategories((prev) => ({ ...prev, [categoryId]: subs }));
      },
    });
  }

  return (
    <div className={styles.page}>
      {/* Hero שקוף עם כתמי אור – תואם לעמודים האחרים */}
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <h1>ניהול קטגוריות</h1>
          <p className={styles.subText}>
            הוספה, צפייה ומחיקה של קטגוריות ותתי־קטגוריות בזמן אמת
          </p>
          <p className={styles.aiAssistantText}>
            שמרו על היררכיה מסודרת למוצרים באתר
          </p>
          <div className={styles.actions}>
            <div className={styles.addCategoryBox} aria-label="הוספת קטגוריה חדשה">
              <input
                className={styles.input}
                placeholder="הוסף קטגוריה חדשה"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                aria-label="שם קטגוריה חדשה"
              />
              <button className={styles.actionButton} onClick={handleAddCategory}>
                הוסף
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* אזור התוכן/כרטיסים */}
      <section className={styles.categoriesSection}>
        <ul className={styles.categoriesList}>
          {categories.map((cat) => (
            <li className={styles.categoryItem} key={cat.id}>
              <div className={styles.categoryCard}>
                <div className={styles.categoryTitleRow}>
                  <span className={styles.categoryName}>{cat.name}</span>
                  <div className={styles.actionsRow}>
                    <button
                      className={styles.sortBtn}
                      onClick={() => handleExpand(cat.id)}
                      aria-expanded={!!expanded[cat.id]}
                      aria-controls={`sub-${cat.id}`}
                    >
                      {expanded[cat.id] ? "סגור" : "הצג תתי־קטגוריה"}
                    </button>
                    <button
                      className={`${styles.sortBtn} ${styles.sortBtnDanger}`}
                      onClick={() => handleDeleteCategory(cat.id)}
                    >
                      מחק
                    </button>
                  </div>
                </div>

                {expanded[cat.id] && (
                  <div id={`sub-${cat.id}`} className={styles.subBlock}>
                    <ul className={styles.subList}>
                      {(subcategories[cat.id] || [])
                        .filter((sub) => sub.name.trim() !== "אחר")
                        .map((sub) => (
                          <li className={styles.subItem} key={sub.id}>
                            <span className={styles.subName}>{sub.name}</span>
                            <button
                              className={`${styles.tagBtn} ${styles.tagBtnDanger}`}
                              onClick={() => handleDeleteSubcategory(sub.id, cat.id)}
                              aria-label={`מחק ${sub.name}`}
                              title="מחק"
                            >
                              ✕
                            </button>
                          </li>
                        ))}
                    </ul>

                    <div className={styles.addSubRow}>
                      <input
                        className={styles.input}
                        placeholder="הוסף תת־קטגוריה"
                        value={newSub[cat.id] || ""}
                        onChange={(e) =>
                          setNewSub((prev) => ({
                            ...prev,
                            [cat.id]: e.target.value,
                          }))
                        }
                        aria-label={`תת־קטגוריה עבור ${cat.name}`}
                      />
                      <button
                        className={styles.actionButton}
                        onClick={() => handleAddSubcategory(cat.id)}
                      >
                        הוסף
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {modalOpen && (
        <CustomModal
          title={modalConfig.title}
          message={modalConfig.message}
          confirmText={modalConfig.confirmText}
          onConfirm={modalConfig.onConfirm}
        />
      )}
    </div>
  );
}
