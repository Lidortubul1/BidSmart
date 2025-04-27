import styles from "./Navbar.module.css";
import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav className={styles.navbar}>
      <div className={styles.logo}>BidSmart</div>
      <ul className={styles.navLinks}>
        <li>
          <Link to="/">דף הבית</Link>
        </li>
        <li>
          <Link to="/login">התחברות</Link>
        </li>
        <li>
          <Link to="/register">הרשמה</Link>
        </li>
        <li>
          <Link to="/profile">פרופיל</Link>
        </li>
      </ul>
    </nav>
  );
}

export default Navbar;
