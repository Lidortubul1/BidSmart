//src\components\navbar\Navbar.jsx
// סרגל ניווט עליון: מציג לוגו וקישורי אתר דינמיים לפי תפקיד המשתמש (buyer/seller/admin),
// כולל פרופיל, "ההצעות שלי", הוספה/ניהול מוצרים וסקשני אדמין, וכן כפתור התנתקות.
// מחשב נתיב בית מותאם לכל תפקיד ומשתמש ב-AuthContext ו-react-router לניווט.

import styles from "./Navbar.module.css";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useState } from "react";
import logoImg from "../../assets/images/BSlogo.png";

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim() !== "") {
      navigate(`/search-results?query=${encodeURIComponent(query)}`);
      setQuery("");
    }
  };

  const isLoggedIn = user && user.role;

  let homePath = "/";
  if (user?.role === "admin") homePath = "/admin";
  else if (user?.role === "seller") homePath = "/seller";
  else if (user?.role === "buyer") homePath = "/buyer";

  return (
    <nav className={styles.navbar}>
      <img src={logoImg} alt="BidSmart Logo" className={styles.logo} />




      <ul className={styles.navLinks}>
        <li>
          <Link to={homePath}>דף הבית</Link>
        </li>

        {/* "מי אנחנו" רק אם זה לא admin */}
        {user?.role !== "admin" && (
          <li>
            <Link to="/info">?מי אנחנו</Link>
          </li>
        )}

        {!isLoggedIn ? (
          <>
            <li>
              <Link to="/login">התחברות</Link>
            </li>
            <li>
              <Link to="/register">הרשמה</Link>
            </li>
          </>
        ) : (
          <>
            <li>
              <Link to="/profile">פרופיל</Link>
            </li>

            {(user.role === "buyer" || user.role === "seller") && (
              <li>
                <Link to="/my-bids">ההצעות שלי</Link>
              </li>
            )}

            {user.role === "seller" && (
              <>
                <li>
                  <Link to="/add-product">הוסף מוצר</Link>
                </li>
                <li>
                  <Link to="/manage-products">ניהול מוצרים</Link>
                </li>
              </>
            )}

            {user.role === "admin" && (
              <>
                <li>
                  <Link to="/admin/categories">ניהול קטגוריות</Link>
                </li>
                <li>
                  <Link to="/admin/users">ניהול משתמשים</Link>
                </li>
                <li>
                  <Link to="/admin/products">ניהול מוצרים</Link>
                </li>
                <li>
                  <Link to="/admin/messages">פניות משתמשים</Link>
                </li>
                <li>
                  <Link to="/admin/stats">סטטיסטיקות</Link>
                </li>
              </>
            )}

            <li>
              <button onClick={handleLogout} className={styles.logoutButton}>
                התנתקות
              </button>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
}

export default Navbar;
