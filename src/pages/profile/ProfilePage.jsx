import { useState, useEffect } from "react";
import { useAuth } from "../../auth/AuthContext";
import axios from "axios";
import styles from "./ProfilePage.module.css";
import citiesData from "../../assets/data/cities_with_streets.json";
import ChangePassword from "../../components/ChangePassword/ChangePassword";

function ProfilePage() {
  const { user, setUser } = useAuth();

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [idCardPhoto, setIdCardPhoto] = useState(null);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [phonePrefix, setPhonePrefix] = useState("+972");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [zip, setZip] = useState("");
  const [city, setCity] = useState("");
  const [street, setStreet] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [apartmentNumber, setApartmentNumber] = useState("");
  const [phoneError, setPhoneError] = useState(false);
  const [selectedCity, setSelectedCity] = useState("");
  const [availableStreets, setAvailableStreets] = useState([]);
  const [selectedStreet, setSelectedStreet] = useState("");
  const [cityTouched, setCityTouched] = useState(false);
  const [country, setCountry] = useState("ישראל");
  const [showChangePassword, setShowChangePassword] = useState(false);

  useEffect(() => {
    if (user) {
      setEmail(user.email || "");
      setFirstName(user.first_name || "");
      setLastName(user.last_name || "");
      setIdNumber(user.id_number || "");
      setPhoneNumber(user.phone?.slice(phonePrefix.length) || "");
      setZip(user.zip || "");
      setCity(user.city || "");
      setStreet(user.street || "");
      setHouseNumber(user.house_number || "");
      setApartmentNumber(user.apartment_number || "");
      setSelectedCity(user.city || "");
      setSelectedStreet(user.street || "");
      const found = citiesData.find((c) => c.city === user.city);
      setAvailableStreets(found ? found.streets : []);
    }
  }, [user]);

  const handleCityChange = (e) => {
    const city = e.target.value;
    setSelectedCity(city);
    setCityTouched(true);
    const found = citiesData.find((c) => c.city === city);
    setAvailableStreets(found ? found.streets : []);
    setSelectedStreet("");
  };

  const handleSave = async (e) => {
    e.preventDefault();

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.(com|org|net|edu|gov|il|co\.il|gmail\.com|hotmail\.com|outlook\.com)$/;
    const zipRegex = /^\d{5,7}$/;
    const idRegex = /^\d{9}$/;
    const houseRegex = /^\d+$/;

    if (!emailRegex.test(email)) return alert("כתובת אימייל לא תקינה");
    if (firstName.trim() === "" || lastName.trim() === "")
      return alert("שם פרטי ושם משפחה חייב להכיל אותיות");
    if (phoneNumber.length !== 7) {
      setPhoneError(true);
      return alert("מספר הטלפון לא תקין");
    }
    if (zip && !zipRegex.test(zip)) return alert("מיקוד לא תקין");
    if (houseNumber && !houseRegex.test(houseNumber))
      return alert("שדה מספר בית לא תקין");
    if (idNumber && !idRegex.test(idNumber))
      return alert("תעודת זהות חייבת להכיל 9 ספרות כולל ספרת ביקורת");

    const formData = new FormData();
    formData.append("email", user.email); // אימייל נוכחי
    formData.append("new_email", email); // אימייל חדש
    formData.append("first_name", firstName);
    formData.append("last_name", lastName);
    formData.append("id_number", idNumber);
    formData.append("phone", phonePrefix + phoneNumber);
    formData.append("country", country);
    formData.append("zip", zip);
    formData.append("city", selectedCity);
    formData.append("street", selectedStreet);
    formData.append("house_number", houseNumber);
    formData.append("apartment_number", apartmentNumber);
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
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
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
                <label>שינוי סיסמה</label>
                <button
                  type="button"
                  className={styles.changePasswordButton}
                  onClick={() => setShowChangePassword(true)}
                >
                  לחץ כאן
                </button>
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
                      if (onlyNums.length === 7) setPhoneError(false);
                    }}
                    onBlur={() => {
                      if (phoneNumber.length !== 7) {
                        setPhoneError(true);
                        alert("מספר טלפון לא תקין");
                      }
                    }}
                  />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label>מדינה</label>
                <input value={country} disabled />
              </div>

              <div className={styles.inputGroup}>
                <label>מיקוד</label>
                <input value={zip} onChange={(e) => setZip(e.target.value)} />
              </div>

              <div className={styles.inputGroup}>
                <label>יישוב</label>
                <select
                  value={selectedCity}
                  onChange={handleCityChange}
                  onBlur={() => setCityTouched(true)}
                  className={cityTouched && !selectedCity ? styles.error : ""}
                >
                  <option value="">בחר יישוב</option>
                  {citiesData.map((c, index) => (
                    <option key={index} value={c.city}>
                      {c.city}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.inputGroup}>
                <label>רחוב</label>
                <select
                  value={selectedStreet}
                  onChange={(e) => {
                    if (!selectedCity) {
                      setCityTouched(true);
                      alert("יש לבחור קודם יישוב");
                      return;
                    }
                    setSelectedStreet(e.target.value);
                  }}
                >
                  <option value="">בחר רחוב</option>
                  {availableStreets.map((street, index) => (
                    <option key={index} value={street}>
                      {street}
                    </option>
                  ))}
                </select>
              </div>

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

        {showChangePassword && (
          <ChangePassword
            email={email}
            onClose={() => setShowChangePassword(false)}
            onSuccess={() => {
              alert("הסיסמה שונתה בהצלחה");
              setShowChangePassword(false);
            }}
          />
        )}
      </div>
    </div>
  );
}

export default ProfilePage;
