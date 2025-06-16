


// מאשר תשלום עבור מוצר לפי product_id
export async function confirmPayment(product_id) {
  try {
    const res = await fetch("http://localhost:5000/api/payment/confirm", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ product_id }),
    });

    return await res.json();
  } catch (error) {
    console.error("❌ שגיאה בקריאת confirmPayment:", error);
    return { success: false, message: "שגיאה בחיבור לשרת" };
  }
}
