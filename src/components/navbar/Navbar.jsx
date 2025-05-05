import styles from "./Navbar.module.css";
import { Link } from "react-router-dom";

function Navbar() {
  // שליפת המשתמש המחובר מ-localStorage
  const user = JSON.parse(localStorage.getItem("user"));

  return (
    <nav className={styles.navbar}>
      <div className={styles.logo}>BidSmart</div>
      <ul className={styles.navLinks}>
        {/* קישורים נוספים */}
        <li>
          <Link to="/direct-sell">מכירה ישירה</Link>
        </li>
        <li>
          <Link to="/direct-buy">קנייה ישירה</Link>
        </li>
        <li>
          <Link to="/about">מי אנחנו</Link>
        </li>
        <li>
          <Link to="/info">מידע</Link>
        </li>

        {/* רק אם המשתמש לא מחובר – הצג התחברות והרשמה */}
        {!user && (
          <>
            <li>
              <Link to="/login">התחברות</Link>
            </li>
            <li>
              <Link to="/register">הרשמה</Link>
            </li>
          </>
        )}
        <li>
          <Link to="/">דף הבית</Link>
        </li>
        {/* פרופיל יוצג רק אם המשתמש מחובר */}
        {user && (
          <li>
            <Link to="/profile">פרופיל</Link>
          </li>
        )}
     
      </ul>
    </nav>
  );
}

export default Navbar;
