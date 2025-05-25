const db = require("./database");

async function checkIsLiveProducts() {
  console.log("🔄 בודק is_live...");

  try {
    const conn = await db.getConnection();

    const [products] = await conn.query(
      "SELECT * FROM product WHERE is_live = 0"
    );

    console.log("🧪 נמצא/ים מוצרים עם is_live = 0: ", products.length);

    for (const product of products) {
      console.log(`🔍 מוצר: ${product.product_id} - ${product.product_name}`);

      if (!product.start_date || !product.start_time) {
        console.error(`❌ חסר תאריך או שעה ב־product_id ${product.product_id}`);
        continue;
      }

      const dateString = new Date(product.start_date)
        .toISOString()
        .slice(0, 10);
      const combined = `${dateString}T${product.start_time}`;
      console.log("🧪 תאריך משולב:", combined);

      const startDateTime = new Date(combined);

      if (isNaN(startDateTime.getTime())) {
        console.error(
          `❌ שגיאה בהמרת תאריך עבור product_id ${product.product_id}: ערך לא תקין (${combined})`
        );
        continue;
      }

      const now = new Date();
      if (now >= startDateTime) {
        await conn.query(
          "UPDATE product SET is_live = 1 WHERE product_id = ?",
          [product.product_id]
        );
        console.log(
          `✅ עודכן is_live = 1 עבור product_id ${product.product_id}`
        );
      }
    }
    
  } catch (err) {
    console.error("❌ שגיאה כללית בבדיקת is_live:", err.message);
  }
}

module.exports = { checkIsLiveProducts };
