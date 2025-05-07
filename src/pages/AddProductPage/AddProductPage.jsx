import ProductForm from "../../components/ProductForm/ProductForm";
import { useAuth } from "../../auth/AuthContext";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import styles from "./AddProductPage.module.css";

function AddProductPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleProductSubmit = async (formData) => {
    try {
      const data = {
        ...formData,
        product_status: "for sale",
        seller_id_number: user.id_number,
      };

      const payload = new FormData();

      for (const key in data) {
        if (data[key]) {
          payload.append(key, data[key]);
        }
      }

      const response = await axios.post(
        "http://localhost:5000/api/product",
        payload,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      if (response.data.success) {
        alert("המוצר נוסף בהצלחה!");
        navigate("/seller");
      } else {
        alert(response.data.message || "שגיאה בהוספת המוצר");
      }
    } catch (error) {
      console.error(error);
      alert("שגיאה בעת שליחת המוצר לשרת");
    }
  };

  return (
    <div className={styles.container}>
      <ProductForm onSubmit={handleProductSubmit} />
    </div>
  );
}

export default AddProductPage;
