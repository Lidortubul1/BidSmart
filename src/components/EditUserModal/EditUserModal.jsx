import { useState } from "react";
import styles from "./EditUserModal.module.css"
import {
  User,
  Mail,
  Phone,
  UserCog,
  Star,
  IdCard,
  FileText,
  Globe,
  MapPin,
  Home,
  Hash,
  Building2,
  Image as ImageIcon,
  CheckCircle,
  X,
} from "lucide-react";

export default function EditUserModal({ user, onClose, onSave }) {
  const [form, setForm] = useState({
    id: user.id,
    email: user.email || "",
    first_name: user.first_name || "",
    last_name: user.last_name || "",
    phone: user.phone || "",
    role: user.role || "buyer",
    profile_photo: user.profile_photo || "",
    id_number: user.id_number || "",
    rating:
      user.role === "seller"
        ? user.rating !== null && user.rating !== undefined
          ? String(user.rating)
          : ""
        : "",
    country: user.country || "",
    zip: user.zip || "",
    city: user.city || "",
    street: user.street || "",
    house_number: user.house_number || "",
    apartment_number: user.apartment_number || "",
    id_card_photo: user.id_card_photo || "",
  });

  const [showError, setShowError] = useState(""); // אם תרצי להציג שגיאות

  const handleDeletePhoto = () => setForm({ ...form, profile_photo: "" });

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "rating") {
      let val = value;
      if (val.includes(".")) {
        const [whole, frac] = val.split(".");
        val = frac.length > 1 ? `${whole}.${frac[0]}` : val;
      }
      setForm((prev) => ({ ...prev, [name]: val }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const cleanUserData = (data) => ({
    ...data,
    id: data.id,
    rating:
      data.role === "seller"
        ? data.rating === "" || data.rating === null
          ? null
          : Number(data.rating)
        : null,
    email: data.email,
    zip: data.zip === "" ? null : data.zip,
    country: data.country === "" ? null : data.country,
    city: data.city === "" ? null : data.city,
    street: data.street === "" ? null : data.street,
    house_number: data.house_number === "" ? null : data.house_number,
    apartment_number:
      data.apartment_number === "" ? null : data.apartment_number,
    phone: data.phone === "" ? null : data.phone,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // אפשר להוסיף ולידציה ולפתוח showError אם צריך
    onSave(cleanUserData(form));
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modalBox}>
        <div className={styles.header}>
          <h2>עריכת משתמש</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        <form
          className={styles.editForm}
          onSubmit={handleSubmit}
          autoComplete="off"
        >
          <div className={styles.formRow}>
            <span className={styles.formIcon}>
              <Mail size={19} />
            </span>
            <label>מייל</label>
            <input
              name="email"
              value={user.email}
              disabled
              style={{ background: "#f3f3f3", color: "#888" }}
            />
          </div>
          <div className={styles.formRow}>
            <span className={styles.formIcon}>
              <User size={19} />
            </span>
            <label>שם פרטי</label>
            <input
              name="first_name"
              value={form.first_name}
              onChange={handleChange}
              autoFocus
            />
          </div>
          <div className={styles.formRow}>
            <span className={styles.formIcon}>
              <UserCog size={19} />
            </span>
            <label>שם משפחה</label>
            <input
              name="last_name"
              value={form.last_name}
              onChange={handleChange}
            />
          </div>
          <div className={styles.formRow}>
            <span className={styles.formIcon}>
              <Phone size={19} />
            </span>
            <label>טלפון</label>
            <input name="phone" value={form.phone} onChange={handleChange} />
          </div>
          <div className={styles.formRow}>
            <span className={styles.formIcon}>
              <Mail size={19} />
            </span>
            <label>תפקיד</label>
            <select name="role" value={form.role} onChange={handleChange}>
              <option value="buyer">קונה</option>
              <option value="seller">מוכר</option>
            </select>
          </div>
          {form.role === "seller" && (
            <div className={styles.formRow}>
              <span className={styles.formIcon}>
                <Star size={19} />
              </span>
              <label>דירוג</label>
              <input
                name="rating"
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={form.rating}
                onChange={handleChange}
                placeholder="0-5"
              />
            </div>
          )}
          <div className={styles.formRow}>
            <span className={styles.formIcon}>
              <IdCard size={19} />
            </span>
            <label>מס' תעודת זהות</label>
            <input
              name="id_number"
              value={form.id_number}
              onChange={handleChange}
            />
            <span className={styles.verifiedStatus}>
              <CheckCircle
                size={15}
                style={{ marginLeft: 5, marginBottom: -2 }}
              />{" "}
              אומת
            </span>
          </div>
          <div className={styles.formRow}>
            <span className={styles.formIcon}>
              <FileText size={18} />
            </span>
            <label>תעודת זהות (קובץ)</label>
            <input
              disabled
              value={form.id_card_photo ? "קיים" : "לא קיים"}
              readOnly
            />
            <span className={styles.verifiedStatus}>
              <CheckCircle
                size={15}
                style={{ marginLeft: 5, marginBottom: -2 }}
              />{" "}
              אומת
            </span>
          </div>
          <div className={styles.formRow}>
            <span className={styles.formIcon}>
              <Globe size={19} />
            </span>
            <label>מדינה</label>
            <input
              name="country"
              value={form.country}
              onChange={handleChange}
            />
          </div>
          <div className={styles.formRow}>
            <span className={styles.formIcon}>
              <Hash size={18} />
            </span>
            <label>מיקוד</label>
            <input name="zip" value={form.zip} onChange={handleChange} />
          </div>
          <div className={styles.formRow}>
            <span className={styles.formIcon}>
              <MapPin size={18} />
            </span>
            <label>עיר</label>
            <input name="city" value={form.city} onChange={handleChange} />
          </div>
          <div className={styles.formRow}>
            <span className={styles.formIcon}>
              <Home size={18} />
            </span>
            <label>רחוב</label>
            <input name="street" value={form.street} onChange={handleChange} />
          </div>
          <div className={styles.formRow}>
            <span className={styles.formIcon}>
              <Building2 size={18} />
            </span>
            <label>מס' בית</label>
            <input
              name="house_number"
              value={form.house_number}
              onChange={handleChange}
            />
          </div>
          <div className={styles.formRow}>
            <span className={styles.formIcon}>
              <Building2 size={18} />
            </span>
            <label>מס' דירה</label>
            <input
              name="apartment_number"
              value={form.apartment_number}
              onChange={handleChange}
            />
          </div>
          <div className={styles.formRow}>
            <span className={styles.formIcon}>
              <ImageIcon size={18} />
            </span>
            <label>תמונת פרופיל</label>
            {form.profile_photo ? (
              <div className={styles.photoPreview}>
                <img src={form.profile_photo} alt="תמונת פרופיל" />
                <button
                  type="button"
                  className={styles.deletePhotoBtn}
                  onClick={handleDeletePhoto}
                >
                  מחק
                </button>
              </div>
            ) : (
              <span className={styles.noPhoto}>אין תמונה</span>
            )}
          </div>

          {showError && <div className={styles.errorBox}>{showError}</div>}

          <div className={styles.actions}>
            <button
              type="submit"
              className={`${styles.actionBtn} ${styles.saveBtn}`}
            >
              שמור
            </button>
            <button
              type="button"
              className={`${styles.actionBtn} ${styles.cancelBtn}`}
              onClick={onClose}
            >
              בטל שינויים
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
