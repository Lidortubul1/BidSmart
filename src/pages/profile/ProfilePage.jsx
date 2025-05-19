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

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || "");
      setLastName(user.last_name || "");
      setIdNumber(user.id_number || "");
    }
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("email", user.email);
    formData.append("first_name", firstName);
    formData.append("last_name", lastName);
    formData.append("id_number", idNumber);
    if (newPassword) formData.append("password", newPassword);
    if (idCardPhoto) formData.append("id_card_photo", idCardPhoto);

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
    <div
      className={styles.profileContainer}
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      <form className={styles.profileForm} onSubmit={handleSave}>
        <h2>הפרופיל שלי</h2>

        <label>אימייל</label>
        <input type="email" value={user?.email || ""} disabled />

        <label>שם פרטי</label>
        <input
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />

        <label>שם משפחה</label>
        <input value={lastName} onChange={(e) => setLastName(e.target.value)} />

        <label>מספר תעודת זהות</label>
        <input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} />

        <label>סיסמה חדשה</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="(אופציונלי)"
        />

        <label>צילום תעודת זהות חדש</label>
        <input
          type="file"
          onChange={(e) => setIdCardPhoto(e.target.files[0])}
        />

        {user?.id_card_photo && (
          <div className={styles.idPreview}>
            <p>צילום קיים:</p>
            <img
              src={`http://localhost:5000/uploads/${user.id_card_photo}`}
              alt="תעודת זהות"
              width="150"
            />
          </div>
        )}

        <button type="submit">שמור שינויים</button>
      </form>
    </div>
  );
}

export default ProfilePage;
