import ProductForm from "../../components/ProductForm/ProductForm";
import { useAuth } from "../../auth/AuthContext";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import styles from "./AddProductPage.module.css"; // אופציונלי לעיצוב

function AddProductPage() {
  
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleProductSubmit = async (data) => {
    try {
      const payload = {
        ...data,
        seller_id_number: user.id_number,
        product_status: "for sale",
      };

      const response = await axios.post(
        "http://localhost:5000/api/product",
        payload
      );

      if (response.data.success) {
        alert("המוצר נוסף בהצלחה!");
        navigate("/seller");
      } else {
        alert("שגיאה בהוספת המוצר");
      }
    } catch (error) {
      console.error(error);
      alert("קרתה שגיאה בעת השליחה לשרת");
    }
  };

  return (
    <div className={styles.container}>
      <ProductForm onSubmit={handleProductSubmit} />
    </div>
  );
}

export default AddProductPage;
