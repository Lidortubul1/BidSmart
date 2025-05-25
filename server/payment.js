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

    const response = await fetch(`${BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(order),
    });

    const data = await response.json();
    console.log("✅ PayPal response:", data); // דיבאג חשוב

    res.json(data);
  } catch (err) {
    console.error("שגיאה ביצירת הזמנה ב-PayPal:", err);
    res.status(500).json({ error: "שגיאה בשרת" });
  }
});

module.exports = router;
