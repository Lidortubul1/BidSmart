import styles from "./Navbar.module.css";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const isLoggedIn = user && user.role; // בודק אם יש משתמש עם תפקיד

  return (
    <nav className={styles.navbar}>
      <div className={styles.logo}>BidSmart</div>
      <ul className={styles.navLinks}>
        <li>
          <Link to="/">דף הבית</Link>
        </li>
        <li>
          <Link to="/about">מי אנחנו</Link>
        </li>
        <li>
          <Link to="/info">מידע</Link>
        </li>

        {!isLoggedIn && (
          <>
            <li>
              <Link to="/login">התחברות</Link>
            </li>
            <li>
              <Link to="/register">הרשמה</Link>
            </li>
          </>
        )}

        {isLoggedIn && (
          <>
            <li>
              <Link to="/profile">פרופיל</Link>
            </li>

            {user.role === "buyer" && (
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
              <li>
                <Link to="/admin-dashboard">ניהול מערכת</Link>
              </li>
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
