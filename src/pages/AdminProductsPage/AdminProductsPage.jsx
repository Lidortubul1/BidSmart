import { useEffect, useState } from "react";
import {fetchAllProducts,deleteProduct,} from "../../services/adminProductsApi";
import CustomModal from "../../components/CustomModal/CustomModal";
import styles from "./AdminProductsPage.module.css";
import { useNavigate } from "react-router-dom";

const FILTERS = [
  { key: "all", label: "כל המוצרים" },
  { key: "not_started", label: "מוצרים שטרם התחילה המכירה" },
  { key: "unsold", label: "מוצרים שלא נמכרו" },
  { key: "sold", label: "מוצרים שנמכרו" },
];

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [modalConfig, setModalConfig] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortByDate, setSortByDate] = useState(false); // חדש!
  const navigate = useNavigate();

  useEffect(() => {
    fetchAllProducts().then(setProducts);
  }, []);

  function handleDelete(id) {
    setModalConfig({
      title: "אישור מחיקה",
      message: "למחוק מוצר זה?",
      confirmText: "מחק",
      onConfirm: async () => {
        await deleteProduct(id);
        setProducts((prev) => prev.filter((p) => p.product_id !== id));
        setModalConfig(null);
      },
      cancelText: "ביטול",
      onCancel: () => setModalConfig(null),
    });
  }

  // --- סינון לפי פילטר נבחר ---
  const filteredByStatus = products.filter((p) => {
    if (filter === "all") return true;
    if (filter === "not_started") return p.is_live === 0;
    if (filter === "unsold")
      return (
        p.product_status === "for sale" &&
        p.winner_id_number == null &&
        p.is_live === 1
      );
    if (filter === "sold")
      return (
        p.winner_id_number != null &&
        p.product_status === "sale" &&
        p.is_live === 1
      );
    return true;
  });

  // --- סינון לפי חיפוש ---
  let filteredProducts = filteredByStatus.filter((p) => {
    const val = search.trim().toLowerCase();
    if (!val) return true;
    return (
      (p.product_name?.toLowerCase() || "").includes(val) ||
      (p.category_name?.toLowerCase() || "").includes(val) ||
      (p.seller_name?.toLowerCase() || "").includes(val)
    );
  });

  // --- מיון לפי תאריך התחלה ---
  if (sortByDate) {
    filteredProducts = [...filteredProducts].sort((a, b) => {
      // שמירה שתאריך מוגדר בפורמט YYYY-MM-DD
      if (!a.start_date && !b.start_date) return 0;
      if (!a.start_date) return 1;
      if (!b.start_date) return -1;
      return new Date(a.start_date) - new Date(b.start_date);
    });
  }
console.log(
  "start_date:",
  filteredProducts.map((p) => p.start_date)
);

  return (
    <div className={styles.page}>
      {/* כפתורי פילטר */}
      <div className={styles.filtersRow}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`${styles.filterBtn} ${
              filter === f.key ? styles.activeFilter : ""
            }`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <h2>ניהול כל המוצרים</h2>

      {/* טופס חיפוש */}
      <div className={styles.searchBox}>
        <input
          type="text"
          placeholder="חפש מוצר..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
        />
      </div>
      {/* כפתור מיון */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "18px",
          margin: "16px 0",
        }}
      >
        <button
          className={`${styles.sortBtn} ${sortByDate ? styles.activeSort : ""}`}
          onClick={() => setSortByDate((prev) => !prev)}
        >
          מיון לפי תאריך התחלה
        </button>
      </div>
      <table className={styles.productsTable}>
        <thead>
          <tr>
            <th>שם מוצר</th>
            <th>קטגוריה</th>
            <th>תת קטגוריה</th>
            <th>תאריך התחלה</th>
            <th>שעת התחלה</th>
            <th>סטטוס</th>
            <th>מוכר</th>
            <th>מחיר נוכחי</th>
            <th>פעולות</th>
          </tr>
        </thead>
        <tbody>
          {filteredProducts.length === 0 ? (
            <tr>
              <td colSpan={9} style={{ color: "#888" }}>
                לא נמצאו מוצרים מתאימים.
              </td>
            </tr>
          ) : (
            filteredProducts.map((p) => (
              <tr key={p.product_id}>
                <td>{p.product_name}</td>
                <td>{p.category_name}</td>
                <td>{p.subcategory_name}</td>
                <td>
                  {/* פורמט תאריך (YYYY-MM-DD) */}
                  {p.start_date
                    ? new Date(p.start_date).toLocaleDateString("he-IL", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                      })
                    : "-"}
                </td>
                <td>
                  {/* שעת התחלה (hh:mm) */}
                  {p.start_time ? p.start_time.slice(0, 5) : "-"}
                </td>
                <td>{p.product_status}</td>
                <td>{p.seller_name}</td>
                <td>{p.current_price}</td>
                <td>
                  <button onClick={() => handleDelete(p.product_id)}>🗑️</button>
                  <button
                    onClick={() => navigate(`/admin/products/${p.product_id}`)}
                  >
                    👁️
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {modalConfig && <CustomModal {...modalConfig} />}
    </div>
  );
}
