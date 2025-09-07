//src\pages\productPage\hooks\useImagesManager.js
// useImagesManager: הוק לניהול תמונות מוצר – מעלה תמונה (מיידית או כ“ממתינה” במצב רליסט), מוחק תמונה קיימת מהשרת, מרענן את נתוני המוצר ומדווח שגיאות דרך onError; מחזיר סטייטים (images, pendingImages) ו־API (onAddImage, removePendingImage, onDeleteImage).

import { useState } from "react";
import { uploadProductImage, removeProductImage } from "../../../services/productApi";

// הוק לניהול תמונות מוצר: טיפול בהעלאה, מחיקה ותמונות ממתינות במצב רליסט
export default function useImagesManager({ productId, relistMode, refreshProduct, onError }) {
  const [images, setImages] = useState([]);        // סטייט לתמונות הקיימות של המוצר
  const [pendingImages, setPendingImages] = useState([]); // סטייט לתמונות שממתינות לפרסום מחדש (רליסט)

  // העלאת תמונה: ברליסט מוסיף לרשימת ממתינות, אחרת מעלה לשרת ומרענן את המוצר
  async function onAddImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (relistMode) {
      setPendingImages((prev) => [...prev, file]);
      e.target.value = "";
      return;
    }

    try {
      await uploadProductImage(productId, file);
      await refreshProduct();
      e.target.value = "";
    } catch (err) {
      console.error(err);
      onError?.("שגיאה בהעלאת תמונה");
    }
  }

  // הסרת תמונה מרשימת הממתינות לרליסט לפי אינדקס
  function removePendingImage(idx) {
    setPendingImages((prev) => prev.filter((_, i) => i !== idx));
  }

  // מחיקת תמונה קיימת מהמוצר בשרת ולאחר מכן רענון המוצר
  async function onDeleteImage(imageUrl) {
    try {
      await removeProductImage(productId, imageUrl);
      await refreshProduct();
    } catch (err) {
      console.error(err);
      onError?.("שגיאה במחיקת תמונה");
    }
  }

  // מחזיר את ה־API לניהול תמונות יחד עם הסטייטים הרלוונטיים
  return { images, setImages, pendingImages, onAddImage, removePendingImage, onDeleteImage };
}
