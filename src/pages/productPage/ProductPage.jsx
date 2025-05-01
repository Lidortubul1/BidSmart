import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";

export default function ProductPage() {
  const { id } = useParams(); // קבלת מזהה מוצר מהכתובת
  const [product, setProduct] = useState(null);

  useEffect(() => {
    async function fetchProduct() {
      try {
        const response = await axios.get(`http://localhost:8001/api/products`);
        const foundProduct = response.data.find(
          (p) => p.product_id === parseInt(id)
        );
        setProduct(foundProduct);
      } catch (error) {
        console.error("Failed to fetch product:", error);
      }
    }

    fetchProduct();
  }, [id]);

  if (!product) {
    return <p>טוען מוצר...</p>;
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>{product.product_name}</h1>
      {product.image && (
        <img
          src={product.image}
          alt={product.product_name}
          style={{ width: "300px", height: "300px", objectFit: "cover" }}
        />
      )}
      <p>מחיר פתיחה: {product.price} ₪</p>
      <p>סטטוס: {product.product_status}</p>
      <p>תיאור: {product.description}</p>
      <p>קטגוריה: {product.category}</p>
      <p>מספר מזהה מוצר: {product.product_id}</p>
    </div>
  );
}
