const db = require("./database");
const auctionTimers = {};

//אחראי על ניהול התקשורת בזמן אמת במערכת המכירה הפומבית החיה של  באמצעות Socket.IO.
//הוא מטפל בהצטרפות למכירה, קבלת הצעות מחיר (bids), עדכון המחיר בזמן אמת, וסיום מכירה.

function setupSocket(io) {
  io.on("connection", (socket) => {
    console.log("🔌 חיבור חדש ל-Socket.IO");

    socket.on("joinAuction", ({ productId }) => {
      socket.join(`room_${productId}`);
      console.log(`👤 הצטרף לחדר room_${productId}`);
    });
    
    socket.on("placeBid", async ({ productId, buyerId }) => {
      console.log("📥 הצעה חדשה:", { productId, buyerId });

      try {
        const conn = await db.getConnection();

        const [rows] = await conn.query(
          "SELECT * FROM product WHERE product_id = ?",
          [productId]
        );

        if (!rows.length) {
          console.log("❌ מוצר לא נמצא במסד");
          return;
        }

        const product = rows[0];

        const now = new Date();
        const startDateTime = new Date(
          `${product.start_date}T${product.start_time}`
        );
        if (now < startDateTime) {
          console.log("⌛ המכירה עדיין לא התחילה");
          return;
        }

        const bidIncrement = Number(product.bid_increment) || 10;
        const newPrice = Number(product.current_price) + bidIncrement;


        // 🔄 במקום INSERT קבוע — נבדוק אם קיימת הצעה
        const [existing] = await conn.query(
          "SELECT * FROM quotation WHERE product_id = ? AND buyer_id_number = ?",
          [productId, buyerId]
        );

        if (existing.length > 0) {
          // קיים — נעדכן
          await conn.query(
            "UPDATE quotation SET price = ?, bid_time = ? WHERE product_id = ? AND buyer_id_number = ?",
            [newPrice, now, productId, buyerId]
          );
        } else {
          // לא קיים — ניצור חדש
          await conn.query(
            "INSERT INTO quotation (product_id, buyer_id_number, price, bid_time, payment_status) VALUES (?, ?, ?, ?, 'not_completed')",
            [productId, buyerId, newPrice, now]
          );
        }

        await conn.query(
          "UPDATE product SET current_price = ?, last_bid_time = ?, winner_id_number = ? WHERE product_id = ?",
          [newPrice, now, buyerId, productId]
        );

        io.to(`room_${productId}`).emit("newBid", {
          price: newPrice,
          buyerId,
          time: now,
        });

        if (auctionTimers[productId]) clearTimeout(auctionTimers[productId]);

        auctionTimers[productId] = setTimeout(async () => {
          try {
            const [finalRows] = await conn.query(
              "SELECT * FROM product WHERE product_id = ?",
              [productId]
            );
            const finalProduct = finalRows[0];

            await conn.query(
              "UPDATE product SET is_live = 0 WHERE product_id = ?",
              [productId]
            );



            const [topBids] = await conn.query(
              `SELECT buyer_id_number FROM quotation 
               WHERE product_id = ? AND price > 0
               ORDER BY price DESC, bid_time ASC 
               LIMIT 3`,
              [productId]
            );

            const winner = topBids[0]?.buyer_id_number || null;
            const second = topBids[1]?.buyer_id_number || null;
            const third = topBids[2]?.buyer_id_number || null;

            await conn.query(
              "UPDATE product SET winner_id_number = ?, second_place_id = ?, third_place_id = ? WHERE product_id = ?",
              [winner, second, third, productId]
            );

            // 🆕 שליפה מחודשת כדי לקבל את הנתונים המעודכנים
            const [updatedRows] = await conn.query(
              "SELECT * FROM product WHERE product_id = ?",
              [productId]
            );
            const updatedProduct = updatedRows[0];

            io.to(`room_${productId}`).emit("auctionEnded", {winnerId: updatedProduct.winner_id_number,
              finalPrice: updatedProduct.current_price,
            });
            
            console.log("📤 שולחת ללקוח winnerId:", updatedProduct.winner_id_number);

            console.log(
              `🔔 המוצר ${productId} הסתיים. זוכה: ${finalProduct.winner_id_number}`
            );
          } catch (error) {
            console.error("❌ שגיאה בסיום מכירה:", error);
          }
        }, 10000);
      } catch (err) {
        console.error("❌ שגיאה בטיפול בהצעה:", err.message);
      }
    });
    
  });
}

module.exports = { setupSocket }; 