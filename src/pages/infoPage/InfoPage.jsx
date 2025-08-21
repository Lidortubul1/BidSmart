// InfoPage.jsx
import React, { useState } from "react";
import styles from "./infoPage.module.css"
import Contacts from "../../components/contacts/contacts";

function InfoPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Contact form sent:", formData);
    setSubmitted(true);
    setFormData({ name: "", email: "", message: "" });
  };

  return (
    <div className={styles.container}>
      <div className={styles.infoBox}>
        <h1 className={styles.title}>ברוכים הבאים ל־BidSmart</h1>

        <section className={styles.section}>
          <h2>על האתר</h2>
          <p>
            BidSmart הוא אתר מכירות פומביות בזמן אמת שמאפשר לכל משתמש לרכוש או
            למכור מוצרים באמצעות מכרזים חכמים ודינאמיים. האתר שם דגש על חוויית
            משתמש, אבטחת מידע, ומערכת מותאמת אישית לפי סוג המשתמש.
          </p>
        </section>

        <section className={styles.section}>
          <h2>סוגי משתמשים</h2>
          <ul>
            <li>
              <strong>קונים:</strong> משתתפים במכרזים בזמן אמת ומנהלים את ההצעות
              שלהם.
            </li>
            <li>
              <strong>מוכרים:</strong> מוסיפים מוצרים, יוצרים מכרזים, ועוקבים
              אחרי ההצעות.
            </li>
            <li>
              <strong>מנהלים:</strong> שומרים על תקינות המערכת, מנהלים משתמשים
              ומכרזים.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>איך זה עובד?</h2>
          <ol>
            <li>נרשמים לאתר ומתחברים</li>
            <li>משתמשים חדשים הם קונים כברירת מחדל</li>
            <li>כדי להפוך למוכרים – מעלים מסמכי זיהוי ומאומתים ע"י המערכת</li>
            <li>המוכרים יכולים להעלות מוצרים ולצפות בהיסטוריית מכירות</li>
          </ol>
        </section>

        <section className={styles.section}>
          <h2>טכנולוגיות בפרויקט</h2>
          <ul>
            <li>React.js (פרונטאנד)</li>
            <li>Node.js + Express (בקאנד)</li>
            <li>MySQL + REST API</li>
            <li>JWT לאימות והרשאות</li>
          </ul>
        </section>
    

      </div>
    </div>
  );
}

export default InfoPage;
