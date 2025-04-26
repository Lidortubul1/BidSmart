import { Link } from "react-router-dom";
import styles from "./Navbar.module.css";

function Navbar() {
  return (
    <nav className={styles.navbar}>
      <ul>
        <li>
          <Link to="/">בית</Link>
        </li>
        <li>
          <Link to="/login">התחברות</Link>
        </li>
        <li>
          <Link to="/register">הרשמה</Link>
        </li>
      </ul>
    </nav>
  );
}

export default Navbar;
