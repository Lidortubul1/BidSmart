import { useState, useEffect } from "react";
import { useAuth } from "../../auth/AuthContext";
import axios from "axios";
import styles from "./ProfilePage.module.css";
import backgroundImage from "../../assets/images/background.jpg";

function ProfilePage() {
  const { user, setUser } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [idCardPhoto, setIdCardPhoto] = useState(null);
  const [profilePhoto, setProfilePhoto] = useState(null);

  const [phonePrefix, setPhonePrefix] = useState("+972");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [country, setCountry] = useState("");
  const [zip, setZip] = useState("");
  const [city, setCity] = useState("");
  const [street, setStreet] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [apartmentNumber, setApartmentNumber] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phoneError, setPhoneError] = useState(false);
  const [touchedPhone, setTouchedPhone] = useState(false);


  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || "");
      setLastName(user.last_name || "");
      setIdNumber(user.id_number || "");
      setPhoneNumber(user.phone?.slice(phonePrefix.length) || "");
      setCountry(user.country || "");
      setZip(user.zip || "");
      setCity(user.city || "");
      setStreet(user.street || "");
      setHouseNumber(user.house_number || "");
      setApartmentNumber(user.apartment_number || "");
    }
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const zipRegex = /^\d{5,7}$/;
    const idRegex = /^\d{8}$/;
    const houseRegex = /^\d+$/;

    if (!emailRegex.test(user.email)) {
      alert("כתובת אימייל לא תקינה");
      return;
    }

    if (firstName.trim() === "" || lastName.trim() === "") {
      alert("שם פרטי ושם משפחה חייב להכיל אותיות");
      return;
    }

    if (phoneNumber.length !== 7) {
      setPhoneError(true);
      alert("מספר הטלפון לא תקין");
      return;
    }

    if (!zipRegex.test(zip)) {
      alert("מיקוד לא תקין");
      return;
    }

    if (!houseRegex.test(houseNumber)) {
      alert("שדה מספר בית לא תקין");
      return;
    }

    if (!idRegex.test(idNumber)) {
      alert("  תעודת זהות חייבת להכיל  9 ספרות כולל ספרת ביקורת");
      return;
    }

    const formData = new FormData();
    formData.append("email", user.email);
    formData.append("first_name", firstName);
    formData.append("last_name", lastName);
    formData.append("id_number", idNumber);
    formData.append("phone", phonePrefix + phoneNumber);
    formData.append("country", "ישראל"); 
    formData.append("zip", zip);
    formData.append("city", city);
    formData.append("street", street);
    formData.append("house_number", houseNumber);
    formData.append("apartment_number", apartmentNumber);
    if (newPassword) formData.append("password", newPassword);
    if (idCardPhoto) formData.append("id_card_photo", idCardPhoto);
    if (profilePhoto) formData.append("profile_photo", profilePhoto);

    try {
      const res = await axios.put(
        "http://localhost:5000/api/auth/update-profile",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          withCredentials: true,
        }
      );

      if (res.data.success) {
        alert("הפרופיל עודכן בהצלחה");
        setUser(res.data.updatedUser);
      } else {
        alert("שגיאה בעדכון");
      }
    } catch (err) {
      console.error("שגיאה:", err);
      alert("שגיאה בשרת");
    }
  };
  
  

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <form className={styles.form} onSubmit={handleSave}>
          <h2>הפרופיל שלי</h2>

          <div className={styles.columns}>
            <div className={styles.inputsColumn}>
              <div className={styles.inputGroup}>
                <label>תפקיד</label>
                <input type="text" value={user?.role} disabled />
              </div>

              <div className={styles.inputGroup}>
                <label>אימייל</label>
                <input type="email" value={user?.email || ""} disabled />
              </div>

              <div className={styles.inputGroup}>
                <label>שם פרטי</label>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>

              <div className={styles.inputGroup}>
                <label>שם משפחה</label>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>

              <div className={styles.inputGroup}>
                <label>סיסמה</label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={
                    newPassword ||
                    (user?.password ? "*".repeat(user.password.length) : "")
                  }
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <label>
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={() => setShowPassword(!showPassword)}
                  />
                  הצג סיסמה
                </label>
              </div>

              <div className={styles.inputGroup}>
                <label>נייד</label>
                <div className={styles.phoneRow}>
                  <select
                    value={phonePrefix}
                    onChange={(e) => setPhonePrefix(e.target.value)}
                  >
                    <option value="+97250">50 972+</option>
                    <option value="+97252">52 972+</option>
                    <option value="+97253">53 972+</option>
                    <option value="+97254">54 972+</option>
                    <option value="+97255">55 972+</option>
                    <option value="+97256">56 972+</option>
                    <option value="+97258">58 972+</option>
                  </select>

                  <input
                    className={`${styles.phoneNumberInput} ${
                      phoneError ? styles.error : ""
                    }`}
                    value={phoneNumber}
                    inputMode="numeric"
                    maxLength={7}
                    onChange={(e) => {
                      const onlyNums = e.target.value.replace(/\D/g, "");
                      setPhoneNumber(onlyNums);

                      // בדיקה רק אם השדה כבר הוזן
                      if (onlyNums.length === 7) {
                        setPhoneError(false);
                      }
                    }}
                    onBlur={() => {
                      if (phoneNumber.length !== 7) {
                        setPhoneError(true);
                        alert("שגיאה באחד או יותר מהפרטים שהוזנו");
                      }
                    }}
                  />
                </div>
              </div>

              <label>מדינה</label>
              <input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />

              <label>מיקוד</label>
              <input value={zip} onChange={(e) => setZip(e.target.value)} />

              <label>עיר</label>
              <input value={city} onChange={(e) => setCity(e.target.value)} />

              <label>רחוב</label>
              <input
                value={street}
                onChange={(e) => setStreet(e.target.value)}
              />

              <label>מספר בית</label>
              <input
                value={houseNumber}
                onChange={(e) => setHouseNumber(e.target.value)}
              />

              <label>מספר דירה</label>
              <input
                value={apartmentNumber}
                onChange={(e) => setApartmentNumber(e.target.value)}
              />

              <label>מספר תעודת זהות</label>
              <input
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
              />
            </div>

            <div className={styles.uploadsColumn}>
              <div className={styles.box}>
                <label>תמונת פרופיל (אופציונלי)</label>
                <input
                  type="file"
                  onChange={(e) => setProfilePhoto(e.target.files[0])}
                />
                {user?.profile_photo && (
                  <img
                    src={`http://localhost:5000/uploads/${user.profile_photo}`}
                    alt="תמונת פרופיל"
                    width="150"
                  />
                )}
              </div>

              <div className={styles.box}>
                <label>תעודת זהות (קובץ)</label>
                <input
                  type="file"
                  onChange={(e) => setIdCardPhoto(e.target.files[0])}
                />
                {user?.id_card_photo && (
                  <img
                    src={`http://localhost:5000/uploads/${user.id_card_photo}`}
                    alt="תז"
                    width="150"
                  />
                )}
              </div>
            </div>
          </div>

          <button type="submit">שמור שינויים</button>
        </form>
      </div>
    </div>
  );
}

export default ProfilePage;
