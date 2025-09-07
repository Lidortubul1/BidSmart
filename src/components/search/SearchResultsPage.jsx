//src\components\search\SearchResultsPage.jsx
// עמוד תוצאות חיפוש: מציג רשימת מוצרים מסוננים לפי שאילתה, קטגוריה ותת־קטגוריה.  
// כולל כותרת מתאימה וכפתור חזרה ללוח הראשי בהתאם לתפקיד המשתמש.  

import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import ProductList from "../productList/productList";
import styles from "./SearchResultsPage.module.css";

function SearchResultsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const queryParams = new URLSearchParams(location.search);
  const query = queryParams.get("query") || "";
  const category = queryParams.get("category") || "";
  const sub = queryParams.get("sub") || "";

  const handleClear = () => {
    let path = "/";
    if (user?.role === "admin") path = "/admin";
    else if (user?.role === "seller") path = "/seller";
    else if (user?.role === "buyer") path = "/buyer";

    navigate(path);
  };

  let title = "תוצאות";
  if (query) title = `תוצאות חיפוש עבור: "${query}"`;
  else if (category && sub) title = `מוצרים בקטגוריה "${category}" > "${sub}"`;
  else if (category) title = `מוצרים בקטגוריה: "${category}"`;

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>{title}</h2>

      <ProductList
        searchQuery={query}
        categoryFilter={category}
        subCategoryFilter={sub}
      />

      <div className={styles.buttonWrapper}>
        <button className={styles.clearButton} onClick={handleClear}>
          חזרה לכל המוצרים
        </button>
      </div>
    </div>
  );
}

export default SearchResultsPage;
