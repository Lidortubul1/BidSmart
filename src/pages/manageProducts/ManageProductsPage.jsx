import { useState, useEffect } from "react";
import styles from "./ManageProductsPage.module.css";
import ProductDetailsModal from "../../components/ProductDetailsModal/ProductDetailsModal";
import { getSellerProducts } from "../../services/sellerApi";

export default function ManageProductsPage() {
  const [products, setProducts] = useState([]);
  const [filter, setFilter] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState(null);
const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchProducts() {
      const data = await getSellerProducts(filter);
      setProducts(data);
    }
    fetchProducts();
  }, [filter]);

//חיפוש לפי שם מוצר
const filteredProducts = products.filter((p) =>
  p.product_name?.toLowerCase().includes(searchQuery.toLowerCase())
);




  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.heroText}>
          <h1>ניהול המוצרים שלי</h1>
          <p className={styles.subText}>כל המוצרים שלך במקום אחד</p>
          <div className={styles.filters}>
            <button onClick={() => setFilter("all")}>כל המוצרים</button>
            <button onClick={() => setFilter("sold")}>
              מוצרים שנמכרו ולא נשלחו/נמסרו לרוכש
            </button>
            <button onClick={() => setFilter("sent")}>
              מוצרים שנשלחו/נמסרו לרוכש
            </button>
            <button onClick={() => setFilter("pending")}>
              מוצרים שטרם התחילו
            </button>
            <button onClick={() => setFilter("unsold")}>
              מוצרים שלא נמכרו
            </button>
          </div>
        </div>
      </div>

      <section className={styles.productsSection}>
        <h2>רשימת המוצרים שלך</h2>
        <input
          type="text"
          placeholder="חפש מוצר לפי שם..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />

        <div className={styles.table}>
          <div className={styles.tableHeader}>
            <span>שם מוצר</span>
            <span>מחיר סופי</span>
            <span>סטטוס</span>
            <span>?נשלח</span>
            <span>פרטי מוצר</span>
          </div>
          {filteredProducts.map((p) => (
            <div className={styles.tableRow} key={p.id}>
              <span>{p.product_name}</span>
              <span>{p.current_price} ₪</span>
              <span>{p.status}</span>
              <span>{p.sent === "yes" ? "נשלח / נמסר" : "טרם נשלח"}</span>{" "}
              {/* עמודת 'נשלח?' */}
              <span>
                <button
                  className={styles.viewButton}
                  onClick={() => setSelectedProduct(p)}
                >
                  צפייה בפרטים
                </button>
              </span>
            </div>
          ))}
        </div>
      </section>

      {selectedProduct && (
        <ProductDetailsModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}
