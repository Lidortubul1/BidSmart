// Product.jsx
import React, { useState } from "react";
import { addProduct } from "../api"; // ייבוא הפונקציה מה-API שלך

export default function Product() {
  const [formData, setFormData] = useState({
    product_name: "",
    start_date: "",
    end_date: "",
    price: "",
    image: "",
    description: "",
    seller_id_number: "",
    product_status: "for sale", // ברירת מחדל
    category: "",
  });

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    await addProduct(formData);
    // אפשר גם לאפס את הטופס אחרי שליחה
    setFormData({
      product_name: "",
      start_date: "",
      end_date: "",
      price: "",
      image: "",
      description: "",
      seller_id_number: "",
      product_status: "for sale",
      category: "",
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        name="product_name"
        placeholder="Product Name"
        value={formData.product_name}
        onChange={handleChange}
        required
      />
      <input
        name="start_date"
        type="date"
        placeholder="Start Date"
        value={formData.start_date}
        onChange={handleChange}
        required
      />
      <input
        name="end_date"
        type="date"
        placeholder="End Date"
        value={formData.end_date}
        onChange={handleChange}
        required
      />
      <input
        name="price"
        type="number"
        step="0.01"
        placeholder="Price"
        value={formData.price}
        onChange={handleChange}
        required
      />
      <input
        name="image"
        placeholder="Image URL"
        value={formData.image}
        onChange={handleChange}
      />
      <textarea
        name="description"
        placeholder="Description"
        value={formData.description}
        onChange={handleChange}
      ></textarea>
      <input
        name="seller_id_number"
        placeholder="Seller ID Number"
        value={formData.seller_id_number}
        onChange={handleChange}
        required
      />
      <select
        name="product_status"
        value={formData.product_status}
        onChange={handleChange}
      >
        <option value="for sale">For Sale</option>
        <option value="sale">Sold</option>
      </select>
      <input
        name="category"
        placeholder="Category"
        value={formData.category}
        onChange={handleChange}
      />

      <button type="submit">Add Product</button>
    </form>
  );
}
