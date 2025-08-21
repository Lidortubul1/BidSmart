import styles from "./Footer.module.css";
import Contacts from "../contacts/contacts";

function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footer}>
      <Contacts variant="strip" />
        <p>כל הזכויות שמורות © BidSmart 2025</p>
      </div>
    </footer>
  );
}
export default Footer;

