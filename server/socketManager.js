// server/socketManager.js
const db = require("./database");

// טיימרים ונעילות
const bidTimers = new Map();       // productId -> timeout (15s מאז ההצעה האחרונה)
const auctionTimers = new Map();   // productId -> timeout (עד סוף המכירה לפי start+end_time)
const auctionClosed = new Set();   // מכירות שכבר נסגרו (מניעת סיום כפול)
const startingAuctions = new Set();// הגנות מירוץ על התחלה
const startTimers = new Map();     // productId -> timeout (טיימר עד תחילת מכירה)

// המרת end_time (HH:MM[:SS] או מספר בדקות) לדקות
function minutesFromEndTime(end_time) {
  if (end_time == null) return 0;
  if (typeof end_time === "number") return end_time; // כבר בדקות
  if (typeof end_time === "string") {
    const [hh = "0", mm = "0", ss = "0"] = end_time.split(":");
    const h = Number(hh) || 0;
    const m = Number(mm) || 0;
    const s = Number(ss) || 0;
    return h * 60 + m + (s > 0 ? 1 : 0); // עיגול מעלה קליל אם יש שניות
  }
  return 0;
}

// סיום מכירה: קובע זוכה, מכבה is_live, משדר לכולם
async function endAuction(io, productId) {
  if (auctionClosed.has(productId)) return;
  auctionClosed.add(productId);

  try {
    const conn = await db.getConnection();

    // מחיר נוכחי (fallback)
    const [prodRows] = await conn.query(
      "SELECT product_id, current_price FROM product WHERE product_id = ?",
      [productId]
    );
    if (!prodRows.length) {
      console.error("endAuction: product not found", productId);
      return;
    }

    // הזוכה: מחיר גבוה ביותר, ואם תיקו — מוקדם יותר
    const [winRows] = await conn.query(
      `SELECT buyer_id_number, price
         FROM quotation
        WHERE product_id = ? AND price > 0
        ORDER BY price DESC, bid_time ASC
        LIMIT 1`,
      [productId]
    );

    const winnerId = winRows[0]?.buyer_id_number || null;
    const finalPrice = winRows[0]?.price ?? prodRows[0].current_price ?? 0;

    // ⬅️ השינוי כאן
    if (winnerId == null) {
      await conn.query(
        "UPDATE product SET winner_id_number = NULL, product_status = 'Not sold' WHERE product_id = ?",
        [productId]
      );
    } else {
      await conn.query(
        "UPDATE product SET winner_id_number = ? WHERE product_id = ?",
        [winnerId, productId]
      );
    }

    // ניקוי טיימרים
    if (bidTimers.has(productId)) {
      clearTimeout(bidTimers.get(productId));
      bidTimers.delete(productId);
    }
    if (auctionTimers.has(productId)) {
      clearTimeout(auctionTimers.get(productId));
      auctionTimers.delete(productId);
    }

    // שידור לכולם
    io.to(`room_${productId}`).emit("auctionEnded", {
      winnerId: winnerId,
      finalPrice: Number(finalPrice) || 0,
    });

    console.log(`🔔 Auction ${productId} ended. Winner: ${winnerId || "—"}`);
  } catch (err) {
    console.error("❌ endAuction error:", err.message || err);
  }
}



async function startAuctionNow(io, productId) {
  try {
    const conn = await db.getConnection();
    const [rows] = await conn.query(
      "SELECT is_live, start_date, end_time FROM product WHERE product_id = ?",
      [productId]
    );
    if (!rows.length) return;

    // אל תתחיל לפני הזמן בפועל
    const startMs = new Date(rows[0].start_date).getTime();
    if (Date.now() < startMs) {
      console.log("⌛ startAuctionNow: not yet time");
      // ודא שיש טיימר שמחכה לזמן הנכון
      await ensureStartTimer(io, productId);
      return;
    }

    if (rows[0].is_live) return; // כבר לייב – אל תתחיל שוב

    await conn.query("UPDATE product SET is_live = 1 WHERE product_id = ?", [productId]);
    io.to(`room_${productId}`).emit("auctionStarted");

    const t = startTimers.get(productId);
    if (t) clearTimeout(t);
    startTimers.delete(productId);

    await ensureAuctionEndTimer(io, productId);
    console.log(`🚀 Auction ${productId} started`);
  } catch (err) {
    console.error("❌ startAuctionNow error:", err.message || err);
  }
}



const MAX_TIMEOUT = 2 ** 31 - 1; // ~24.8 days in ms

async function ensureStartTimer(io, productId) {
  // אם כבר יש טיימר – לא ליצור כפול
  if (startTimers.has(productId)) return;

  try {
    const conn = await db.getConnection();
    const [rows] = await conn.query(
      "SELECT start_date, is_live FROM product WHERE product_id = ?",
      [productId]
    );
    if (!rows.length) return;

    const { start_date, is_live } = rows[0];
    if (is_live) return; // כבר לייב – אין צורך בטיימר

    const startMs = new Date(start_date).getTime();
    const now = Date.now();
    let msUntil = startMs - now;

    if (msUntil <= 0) {
      // הזמן כבר הגיע – תנסה להתחיל עכשיו בצורה בטוחה
      await startAuction(io, productId); // עושה בדיקות בפנים
      return;
    }

    // ננקה טיימר ישן אם בטעות נשאר
    if (startTimers.has(productId)) {
      clearTimeout(startTimers.get(productId));
      startTimers.delete(productId);
    }

    // נ schedule במקטעים: כל פעם עד MAX_TIMEOUT ואז ממשיכים
    const chunk = Math.min(msUntil, MAX_TIMEOUT);
    const tid = setTimeout(async function tick() {
      try {
        const now2 = Date.now();
        const left = startMs - now2;
        if (left <= 0) {
          await startAuction(io, productId); // יתחיל רק אם באמת הגיע הזמן
          startTimers.delete(productId);
          return;
        }
        const next = Math.min(left, MAX_TIMEOUT);
        const nextTid = setTimeout(tick, next);
        startTimers.set(productId, nextTid);
      } catch (e) {
        console.error("ensureStartTimer tick error:", e);
        startTimers.delete(productId);
      }
    }, chunk);

    startTimers.set(productId, tid);

    console.log(`⏳ Start timer set for product ${productId} — starts in ${Math.ceil(msUntil / 1000)}s`);
  } catch (err) {
    console.error("❌ ensureStartTimer error:", err.message || err);
  }
}


// הבטחת טיימר סיום כולל (לפי start_date + end_time)
async function ensureAuctionEndTimer(io, productId) {
  if (auctionTimers.has(productId)) return;

  try {
    const conn = await db.getConnection();
    const [rows] = await conn.query(
  "SELECT start_date, end_time, is_live, winner_id_number FROM product WHERE product_id = ?",
      [productId]
    );
    if (!rows.length) return;

    const product = rows[0];

// אם לא לייב – אין טיימר
if (!product.is_live) return;

// חדש: אם כבר יש זוכה – אין מה לתזמן
if (product.winner_id_number) return;

    const startMs = new Date(product.start_date).getTime();
    const durationMinutes = minutesFromEndTime(product.end_time);
    const endMs = startMs + durationMinutes * 60 * 1000;
    const msLeft = Math.max(endMs - Date.now(), 0);

    if (msLeft === 0) {
      // עבר הזמן — סיים מיידית
      endAuction(io, productId);
      return;
    }

    const tout = setTimeout(() => endAuction(io, productId), msLeft);
    auctionTimers.set(productId, tout);

    console.log(
      `⏳ Auction timer set for product ${productId} — ends in ${Math.ceil(msLeft / 1000)}s`
    );
  } catch (err) {
    console.error("❌ ensureAuctionEndTimer error:", err.message || err);
  }
}

// התחלת מכירה (אם הגיע הזמן) + שידור auctionStarted
async function startAuction(io, productId, { force = false } = {}) {
  if (auctionClosed.has(productId)) return { started: false, reason: "closed" };
  if (startingAuctions.has(productId)) return { started: false, reason: "busy" };

  startingAuctions.add(productId);
  try {
    const conn = await db.getConnection();
    const [rows] = await conn.query(
      "SELECT is_live, start_date, end_time FROM product WHERE product_id = ?",
      [productId]
    );
    if (!rows.length) return { started: false, reason: "notFound" };

    const { is_live, start_date } = rows[0];

    if (is_live === 1) {
      await ensureAuctionEndTimer(io, productId);
      io.to(`room_${productId}`).emit("auctionStarted");
      return { started: false, reason: "alreadyLive" };
    }

    // טריגר רק אם כבר הגענו לזמן (אלא אם force)
    if (!force && Date.now() < new Date(start_date).getTime()) {
      return { started: false, reason: "notYet" };
    }

    // עדכון מותנה (מונע מירוץ)
    const [upd] = await conn.query(
      "UPDATE product SET is_live = 1 WHERE product_id = ? AND is_live = 0",
      [productId]
    );

    if (upd.affectedRows > 0) {
      io.to(`room_${productId}`).emit("auctionStarted");
      await ensureAuctionEndTimer(io, productId);
      console.log(`🚀 Auction ${productId} started`);
      return { started: true };
    }

    return { started: false, reason: "noRowChanged" };
  } catch (e) {
    console.error("❌ startAuction error:", e.message || e);
    return { started: false, reason: "error" };
  } finally {
    startingAuctions.delete(productId);
  }
}

function setupSocket(io) {
  io.on("connection", (socket) => {
    console.log("🔌 Socket.IO connected", socket.id);

    // הצטרפות לחדר מוצר
socket.on("joinAuction", async ({ productId }) => {
  try {
    socket.join(`room_${productId}`);
    console.log(` joined room_${productId}`);

    // טיימר התחלה אם עדיין לא התחילה
    await ensureStartTimer(io, productId);

    // טיימר סיום כולל אם כבר לייב
    await ensureAuctionEndTimer(io, productId);
  } catch (err) {
    console.error(" joinAuction error:", err.message || err);
  }
});


    // בקשת התחלה מהקליינט כשקאונטדאון הגיע ל-0
    socket.on("requestStartAuction", async ({ productId }) => {
      try {
        await startAuction(io, productId); // יתחיל רק אם באמת הגיע הזמן
      } catch (e) {
        console.error("requestStartAuction error:", e.message || e);
      }
    });

    // הצעת מחיר
    socket.on("placeBid", async ({ productId, buyerId, customAmount }) => {
      if (!buyerId) {
        console.log("❌ placeBid without buyerId");
        return;
      }
      if (auctionClosed.has(productId)) return;

      try {
        const conn = await db.getConnection();
        const [rows] = await conn.query(
          "SELECT * FROM product WHERE product_id = ?",
          [productId]
        );
        if (!rows.length) {
          console.log("❌ product not found", productId);
          return;
        }
        const product = rows[0];

        if (product.winner_id_number) {
  console.log("⛔ auction already ended (has winner)");
  return;
}
        if (!product.is_live) {
          console.log("⌛ auction is not live");
          return;
        }

        const now = Date.now();
        const startMs = new Date(product.start_date).getTime();
        if (now < startMs) {
          console.log("⌛ auction not started yet");
          return;
        }

        await ensureAuctionEndTimer(io, productId);

        const bidIncrement =
          Number(customAmount) || Number(product.bid_increment) || 10;
        const basePrice =
          Number(product.current_price) || Number(product.price) || 0;
        const newPrice = basePrice + bidIncrement;
        const bidTime = new Date();

        // upsert ל־quotation
        const [existing] = await conn.query(
          "SELECT quotation_id FROM quotation WHERE product_id = ? AND buyer_id_number = ?",
          [productId, buyerId]
        );
        if (existing.length > 0) {
          await conn.query(
            "UPDATE quotation SET price = ?, bid_time = ? WHERE quotation_id = ?",
            [newPrice, bidTime, existing[0].quotation_id]
          );
        } else {
          await conn.query(
            `INSERT INTO quotation 
             (product_id, buyer_id_number, price, bid_time, payment_status) 
             VALUES (?, ?, ?, ?, 'not_completed')`,
            [productId, buyerId, newPrice, bidTime]
          );
        }

        // עדכון המוצר
await conn.query(
  "UPDATE product SET current_price = ?, last_bid_time = ? WHERE product_id = ?",
  [newPrice, bidTime, productId]
);


        // שדר לקליינטים
        io.to(`room_${productId}`).emit("newBid", {
          price: newPrice,
          buyerId,
          time: bidTime.toISOString(),
        });

        // טיימר 15 שניות מאז ההצעה האחרונה
        if (bidTimers.has(productId)) clearTimeout(bidTimers.get(productId));
        const bidTimeout = setTimeout(() => endAuction(io, productId), 15_000);
        bidTimers.set(productId, bidTimeout);
      } catch (err) {
        console.error("❌ placeBid error:", err.message || err);
      }
    });

    socket.on("disconnect", () => {
      // אופציונלי: לוג
      // console.log("🔌 socket disconnected", socket.id);
    });
  });
}

module.exports = { setupSocket, startAuction, endAuction };
