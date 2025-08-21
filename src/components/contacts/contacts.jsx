import { useState, useMemo } from "react";
import { useAuth } from "../../auth/AuthContext";
import CustomModal from "../CustomModal/CustomModal";
import styles from "./contacts.module.css";
import { createGeneralTicket, createReportTicket } from "../../services/contactApi";

/**
 * שימוש:
 *   <Contacts variant="strip" />   // פס עם רקע חמים (לפוטר/לנדינג) – תמיד פנייה כללית
 *   <Contacts variant="compact" mode="report" productId="123" /> // דיווח על מוצר
 *   <Contacts variant="page" mode="general" />  // עמוד מלא לפנייה כללית
 */
export default function Contacts({
  variant = "compact",
  title = "פנה אלינו לכל שאלה",
  mode = "general",            // "general" או "report"
  productId,                   // חובה רק כשmode="report"
  readOnlyUserFields = true,   // לנעול שדות שם/אימייל במצב report
  onDone,                      // callback לסגירת מודאל חיצוני (אופציונלי)
}) {
  const isPage  = variant === "page";
  const isStrip = variant === "strip";
  const { user } = useAuth();

  const [formVals, setFormVals] = useState({
    subjectTxt: "",
    first: user?.first_name || "",
    last:  user?.last_name  || "",
    mail:  user?.email      || "",
    bodyTxt: "",
  });

  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState({ open: false, title: "", msg: "" });

  // נעילת שדות שם/אימייל במצב דיווח
  const userFieldsLocked = readOnlyUserFields && mode === "report";

  // בדיקות ולידציה לטופס
  const canSubmit = useMemo(() => {
    const basic = formVals.subjectTxt.trim().length >= 3 &&
                  formVals.bodyTxt.trim().length   >= 10;

    if (mode === "report") {
      return basic; // דיווח – לא בודקים שם/אימייל
    }
    return (
      basic &&
      formVals.first.trim().length >= 2 &&
      formVals.last.trim().length  >= 2 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formVals.mail)
    );
  }, [formVals, mode]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setFormVals((prev) => ({ ...prev, [name]: value }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit || busy) return;

    // guard – חובה productId רק בדיווח
    if (mode === "report" && !productId) {
      setModal({ open: true, title: "חסר מזהה מוצר", msg: "לא ניתן לשלוח דיווח ללא productId." });
      return;
    }

    try {
      setBusy(true);

      if (mode === "report") {
        await createReportTicket({
          product_id: productId,
          subject: formVals.subjectTxt.trim(),
          body:    formVals.bodyTxt.trim(),
        });
      } else {
        await createGeneralTicket({
          subject: formVals.subjectTxt.trim(),
          email:   formVals.mail.trim(),
          first_name: formVals.first.trim(),
          last_name:  formVals.last.trim(),
          body:    formVals.bodyTxt.trim(),
        });
      }
    
      setModal({
        open: true,
        title: "נשלח ✅",
        msg: mode === "report"
          ? "הדיווח נקלט ונבדק."
          : "תודה על הפנייה! נחזור אלייך במייל שהזנת.",
      });

      // אפס שדות
      setFormVals({
        subjectTxt: "",
        first: user?.first_name || "",
        last:  user?.last_name  || "",
        mail:  user?.email      || "",
        bodyTxt: "",
      });

      // אם הועבר callback חיצוני
      onDone && onDone();
    } catch {
       
      setModal({
        open: true,
        title: "שגיאה בשליחה",
        msg: "לא הצלחנו לשלוח את ההודעה. בדקי חיבור ונסי שוב.",
      });
    } finally {
      setBusy(false);
    }
  }

  /* ===== מצב strip ===== */
  if (isStrip) {
    // strip תמיד פנייה כללית (mode מתעלמים)
    return (
      <section className={styles.stripWrap}>
        <div className={styles.strip}>
          <h3 className={styles.stripTitle}>{title}</h3>
          <form className={styles.stripForm} onSubmit={handleSubmit} noValidate>
            {/* subject */}
            <div className={styles.stripField}>
              <label htmlFor="subjectTxt" className={styles.stripLbl}>נושא</label>
              <input
                id="subjectTxt"
                name="subjectTxt"
                className={styles.stripInput}
                type="text"
                placeholder="(מינ' 3 תווים)"
                value={formVals.subjectTxt}
                onChange={onChange}
                minLength={3}
                required
              />
            </div>
            {/* first */}
            <div className={styles.stripField}>
              <label htmlFor="first" className={styles.stripLbl}>שם פרטי</label>
              <input
                id="first"
                name="first"
                className={styles.stripInput}
                type="text"
                value={formVals.first}
                onChange={onChange}
                minLength={2}
                required
                readOnly={userFieldsLocked}
                disabled={userFieldsLocked}
              />
            </div>
            {/* last */}
            <div className={styles.stripField}>
              <label htmlFor="last" className={styles.stripLbl}>שם משפחה</label>
              <input
                id="last"
                name="last"
                className={styles.stripInput}
                type="text"
                value={formVals.last}
                onChange={onChange}
                minLength={2}
                required
                readOnly={userFieldsLocked}
                disabled={userFieldsLocked}
              />
            </div>
            {/* mail */}
            <div className={styles.stripField}>
              <label htmlFor="mail" className={styles.stripLbl}>אימייל</label>
              <input
                id="mail"
                name="mail"
                className={styles.stripInput}
                type="email"
                value={formVals.mail}
                onChange={onChange}
                required
                readOnly={userFieldsLocked}
                disabled={userFieldsLocked}
              />
            </div>
            {/* body */}
            <div className={`${styles.stripField} ${styles.stripMsg}`}>
              <label htmlFor="bodyTxt" className={styles.stripLbl}>הודעה</label>
              <input
                id="bodyTxt"
                name="bodyTxt"
                className={styles.stripInput}
                type="text"
                placeholder="(מינ' 10 תווים)"
                value={formVals.bodyTxt}
                onChange={onChange}
                minLength={10}
                required
              />
            </div>
            <button type="submit" className={styles.stripBtn} disabled={!canSubmit || busy}>
              {busy ? "שולח..." : "שלח/י"}
            </button>
          </form>
        </div>
        <div className={styles.stripUnderbar} />
        {modal.open && (
          <CustomModal
            title={modal.title}
            message={modal.msg}
            confirmText="סגירה"
            onConfirm={() => setModal((m) => ({ ...m, open: false }))}
            onClose={() => setModal((m) => ({ ...m, open: false }))}
          />
        )}
      </section>
    );
  }

  /* ===== compact/page ===== */
  return (
    <div className={isPage ? styles.pageWrap : styles.wrap}>
      <section className={`${styles.card} ${isPage ? styles.cardPage : styles.cardCompact}`}>
        <h2 className={`${styles.heading} ${isPage ? styles.headingPage : styles.headingCompact}`}>
          {title}
        </h2>
        {isPage && mode === "general" && (
          <p className={styles.sub}>
            זה המקום לשלוח הודעה כללית (לא דיווח על מוצר ספציפי). תשובת המערכת תישלח למייל שהזנת.
          </p>
        )}
        <form className={`${styles.form} ${isPage ? "" : styles.formCompact}`} onSubmit={handleSubmit} noValidate>
          {/* subject */}
          <div className={styles.rowInline}>
            <label className={`${styles.lbl} ${styles.lblInline}`} htmlFor="subjectTxt">נושא</label>
            <input id="subjectTxt" name="subjectTxt" type="text"
              className={`${styles.input} ${styles.inputInline}`}
              value={formVals.subjectTxt} onChange={onChange} minLength={3} required />
          </div>
          {/* first+last */}
          <div className={`${styles.grid2} ${isPage ? "" : styles.grid2Compact}`}>
            <div className={styles.rowInline}>
              <label className={`${styles.lbl} ${styles.lblInline}`} htmlFor="first">שם פרטי</label>
              <input id="first" name="first" type="text"
                className={`${styles.input} ${styles.inputInline}`}
                value={formVals.first} onChange={onChange} minLength={2} required
                readOnly={userFieldsLocked} disabled={userFieldsLocked} />
            </div>
            <div className={styles.rowInline}>
              <label className={`${styles.lbl} ${styles.lblInline}`} htmlFor="last">שם משפחה</label>
              <input id="last" name="last" type="text"
                className={`${styles.input} ${styles.inputInline}`}
                value={formVals.last} onChange={onChange} minLength={2} required
                readOnly={userFieldsLocked} disabled={userFieldsLocked} />
            </div>
          </div>
          {/* mail */}
          <div className={styles.rowInline}>
            <label className={`${styles.lbl} ${styles.lblInline}`} htmlFor="mail">אימייל</label>
            <input id="mail" name="mail" type="email"
              className={`${styles.input} ${styles.inputInline}`}
              value={formVals.mail} onChange={onChange} required
              readOnly={userFieldsLocked} disabled={userFieldsLocked} />
          </div>
          {/* body */}
          <div className={`${styles.rowInline} ${styles.rowInlineText}`}>
            <label className={`${styles.lbl} ${styles.lblInline}`} htmlFor="bodyTxt">תוכן ההודעה</label>
            <textarea id="bodyTxt" name="bodyTxt"
              className={`${styles.textarea} ${styles.inputInline}`}
              value={formVals.bodyTxt} onChange={onChange} rows={isPage ? 6 : 4}
              minLength={10} required />
          </div>
          <div className={`${styles.actions} ${isPage ? "" : styles.actionsCompact}`}>
            <button type="submit" className={`${styles.btn} ${isPage ? "" : styles.btnCompact}`}
              disabled={!canSubmit || busy}>
              {busy ? "שולח..." : "שלח/י הודעה"}
            </button>
          </div>
        </form>
      </section>
      {modal.open && (
        <CustomModal
          title={modal.title}
          message={modal.msg}
          confirmText="סגירה"
          onConfirm={() => setModal((m) => ({ ...m, open: false }))}
          onClose={() => setModal((m) => ({ ...m, open: false }))}
        />
      )}
    </div>
  );
}
