import { useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import styles from "./becomeSeller.module.css";

function BecomeSellerPage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [idNumber, setIdNumber] = useState("");
  const [idPhoto, setIdPhoto] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!idNumber || !idPhoto) {
      alert("נא למלא תעודת זהות ולצרף קובץ");
      return;
    }

    const formData = new FormData();
    formData.append("id_number", idNumber);
    formData.append("id_card_photo", idPhoto);
    formData.append("email", user.email);

    try {
      await axios.put(
        "http://localhost:5000/api/auth/upgrade-role",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      const updatedUser = { ...user, role: "seller", id_number: idNumber };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));

      alert("הפכת למוכר!");
      navigate("/add-product");
    } catch (err) {
      console.error("שגיאה:", err);
      alert("שגיאה בעדכון");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.formContainer}>
        <h1>הפוך למוכר</h1>
        <p>כדי להתחיל למכור פריטים, מלא את פרטיך:</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <label>
            תעודת זהות:
            <input
              type="text"
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              required
            />
          </label>

          <label>
            צילום תעודת זהות:
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setIdPhoto(e.target.files[0])}
              required
            />
          </label>

          <button type="submit">הפוך למוכר</button>
        </form>
      </div>
    </div>
  );
}

export default BecomeSellerPage;
