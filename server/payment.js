//server\payment.js
// מודול תשלומים (PayPal):
// - יוצר הזמנה ב-PayPal (create-order) לפי מחיר המוצר העדכני.
// - מאשר תשלום (confirm): מסמן את הצעת הזוכה כ-is_paid='yes',
//   מעדכן product_status='sale' ומוסיף/מעדכן רשומת sale (end_date, final_price, buyer).
// - כולל השגת access token מ-PayPal וקריאות API לסנדבוקס.
// - טיפול בשגיאות וטרנזקציות DB להבטחת עקביות.

const express = require("express");
const router = express.Router();
const db = require("./database");
const fetch = require("node-fetch");

const PAYPAL_CLIENT_ID =
  "AUGOdRg5iDwlaef7CMTTSFXiSZQSvMVkNxH0ip7GL1KlBXJYgT1c4pOiCxTG0GwTrOXLTtLVIAEAKRTa"; // החלף בפרטים שלך
const PAYPAL_CLIENT_SECRET =
  "ECwmbEtqsdnepDeVFSN2sEQjVAcVc4KgGq1usvIT9EK4XcYEnUc7J3ZG90jv2W1S9SdyyqXMpnT7fbow";
const BASE = "https://api-m.sandbox.paypal.com";

// קבלת access token מ-PayPal
async function getAccessToken() {
  const auth = Buffer.from(
    `${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`
  ).toString("base64");

  const response = await fetch(`${BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await response.json();
  return data.access_token;
}

// יצירת הזמנה
router.post("/create-order", async (req, res) => {
  const { product_id } = req.body;

  if (!product_id) {
    return res.status(400).json({ error: "חסר product_id" });
  }

  try {
    const conn = await db.getConnection();
    const [rows] = await conn.execute(
      "SELECT * FROM product WHERE product_id = ?",
      [product_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "המוצר לא נמצא" });
    }

    const product = rows[0];
    const priceToCharge = Number(product.current_price || product.price);

    if (isNaN(priceToCharge) || priceToCharge <= 0) {
      return res.status(400).json({ error: "המחיר אינו תקף לתשלום" });
    }

    const accessToken = await getAccessToken();

    const order = {
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "ILS",
            value: priceToCharge.toFixed(2),
          },
          description: product.product_name,
        },
      ],
      application_context: {
        return_url: `http://localhost:3000/payment-success/${product.product_id}`,
        cancel_url: `http://localhost:3000/payment-cancelled`,
      },
    };
console.log({product_id});
    const response = await fetch(`${BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(order),
    });

    const data = await response.json();
    console.log(" PayPal response:", data); // דיבאג חשוב

    res.json(data);
  } catch (err) {
    console.error("שגיאה ביצירת הזמנה ב-PayPal:", err);
    res.status(500).json({ error: "שגיאה בשרת" });
  }
});

// אישור תשלום: מסמן את ההצעה הזוכה כ-is_paid='yes' ומוסיף לטבלת sale עם end_date=NOW() וגם מעדכן את סטטוס המוצר לנמכר
router.post("/confirm", async (req, res) => {
  const productId = req.body.product_id;
  if (!productId) {
    return res.status(400).json({ success: false, message: "חסר product_id" });
  }

  const conn = await db.getConnection(); // חיבור יחיד

  try {
    await conn.beginTransaction();

    // 1) מביאים את הזוכה + שם המוצר
    const [prodRows] = await conn.execute(
      "SELECT winner_id_number, product_name FROM product WHERE product_id = ?",
      [productId]
    );
    if (prodRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: "מוצר לא נמצא" });
    }
        //סימון מוצר כנמכר 
    await conn.execute(
      "UPDATE product SET product_status = 'sale' WHERE product_id = ?",
      [productId]
    );

    const winnerId = prodRows[0].winner_id_number;
    const productName = prodRows[0].product_name;
    if (!winnerId) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: "אין זוכה למוצר זה" });
    }

    // 2) מאתרים את השורה הזוכה בהצעות
    const [winRows] = await conn.execute(
      `SELECT quotation_id, price
       FROM quotation
       WHERE product_id = ? AND buyer_id_number = ?
       ORDER BY price DESC, bid_time DESC
       LIMIT 1`,
      [productId, winnerId]
    );
    if (winRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: "לא נמצאה הצעת זוכה" });
    }

    const { quotation_id: quotationId, price: finalPrice } = winRows[0];

    // 3) מסמנים את ההצעה כבתשלום
    await conn.execute(
      "UPDATE quotation SET is_paid = 'yes' WHERE quotation_id = ?",
      [quotationId]
    );
    
    // 4) בדיקה אם יש כבר רשומת sale למוצר הזה
    const [existingSale] = await conn.execute(
      "SELECT sale_id FROM sale WHERE product_id = ? LIMIT 1",
      [productId]
    );

    if (existingSale.length === 0) {
      // הוספת רשומה חדשה
      await conn.execute(
        `INSERT INTO sale
           (end_date, final_price, product_name, product_id, buyer_id_number)
         VALUES (NOW(), ?, ?, ?, ?)`,
        [finalPrice, productName, productId, winnerId]
      );
    } else {
      // עדכון רשומה קיימת
      await conn.execute(
        `UPDATE sale
         SET end_date = NOW(),
             final_price = ?,
             product_name = ?,
             buyer_id_number = ?
         WHERE product_id = ?`,
        [finalPrice, productName, winnerId, productId]
      );
    }

    await conn.commit();
    return res.json({ success: true, product_id: productId });
  } catch (err) {
    await conn.rollback();
    console.error(" confirmPayment error:", err);
    return res.status(500).json({ success: false, message: "שגיאה בשרת" });
  }
});

module.exports = router;
