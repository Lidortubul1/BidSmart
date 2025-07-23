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

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState("");
  const [expanded, setExpanded] = useState({});
  const [subcategories, setSubcategories] = useState({});
  const [newSub, setNewSub] = useState({});

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
  
  //הוספת קטגוריה
  async function handleAddCategory() {
    if (!newCategory.trim()) return;
    await addCategory(newCategory);
    setNewCategory("");
    loadCategories();
  }

  //הוספת תת-קטגוריה
  async function handleAddSubcategory(categoryId) {
    const name = newSub[categoryId];
    if (!name || !name.trim()) return;
    await addSubcategory(name, categoryId);
    setNewSub((prev) => ({ ...prev, [categoryId]: "" }));
    const subs = await fetchSubcategories(categoryId);
    setSubcategories((prev) => ({ ...prev, [categoryId]: subs }));
  }

  async function handleDeleteCategory(id) {
    if (window.confirm("למחוק את הקטגוריה?")) {
      await deleteCategory(id);
      loadCategories();
    }
  }

  async function handleDeleteSubcategory(subId, categoryId) {
    if (window.confirm("למחוק את תת־הקטגוריה?")) {
      await deleteSubcategory(subId);
      const subs = await fetchSubcategories(categoryId);
      setSubcategories((prev) => ({ ...prev, [categoryId]: subs }));
    }
  }

  return (
    <div className={styles.categoriesPage}>
      <h2 className={styles.title}>ניהול קטגוריות</h2>
      <div className={styles.addCategoryBox}>
        <input
          placeholder="הוסף קטגוריה חדשה"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
        />
        <button onClick={handleAddCategory}>הוסף</button>
      </div>
      <ul className={styles.categoriesList}>
        {categories.map((cat) => (
          <li className={styles.categoryItem} key={cat.id}>
            <div className={styles.categoryTitleRow}>
              <span className={styles.categoryName}>{cat.name}</span>
              <button
                className={styles.actionBtn}
                onClick={() => handleExpand(cat.id)}
              >
                {expanded[cat.id] ? "סגור" : "הצג תתי קטגוריה"}
              </button>
              <button
                className={`${styles.actionBtn} ${styles.deleteBtn}`}
                onClick={() => handleDeleteCategory(cat.id)}
              >
                מחק
              </button>
            </div>
            {expanded[cat.id] && (
              <div>
                <ul className={styles.subList}>
                  {(subcategories[cat.id] || []).map((sub) => (
                    <li
                      key={sub.id}
                      style={{ display: "flex", alignItems: "center" }}
                    >
                      <span>{sub.name}</span>
                      <button
                        className={`${styles.actionBtn} ${styles.deleteBtn}`}
                        style={{
                          marginRight: 7,
                          fontSize: ".95em",
                          padding: "0.3rem 1rem",
                        }}
                        onClick={() => handleDeleteSubcategory(sub.id, cat.id)}
                      >
                        מחק
                      </button>
                    </li>
                  ))}
                </ul>
                <div className={styles.addSubRow}>
                  <input
                    placeholder="הוסף תת קטגוריה"
                    value={newSub[cat.id] || ""}
                    onChange={(e) =>
                      setNewSub((prev) => ({
                        ...prev,
                        [cat.id]: e.target.value,
                      }))
                    }
                  />
                  <button onClick={() => handleAddSubcategory(cat.id)}>
                    הוסף
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
