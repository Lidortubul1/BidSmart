const express = require("express");
const router = express.Router();
const db = require("./database");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
//אחסון תמונות
const storage = require("./storage");
const upload = multer({ storage });
const nodemailer = require("nodemailer");

// קבלת כל המוצרים למכירה בלבד שהם לא sale
router.get("/", async (req, res) => {
  try {
    const conn = await db.getConnection();

    const [products] = await conn.execute(
      "SELECT * FROM product WHERE product_status = 'for sale'"
    );
    console.log(products[0])
    //  הוספת תמונות לכל מוצר
    for (const product of products) {
      const [images] = await conn.execute(
        "SELECT image_url FROM product_images WHERE product_id = ?",
        [product.product_id]
      );
      product.images = images.map((img) => img.image_url); // מוסיף product.images
    }

    res.json(products); //  כאן מחזיר את כל המוצרים ללקוח
  } catch (e) {
    console.error("שגיאה בקבלת מוצרים:", e);
    res.status(500).json({ error: "Failed to fetch product" });
  }
});



// בדיקה האם מוכר בחר משלוח או משלוח+איסוף עצמי- וייבוא פרטי המוכר
// בדיקה האם מוכר בחר משלוח או משלוח+איסוף עצמי (כולל דירוג המוכר)
// server (routes for /api/product)

// בדיקה האם מוכר בחר משלוח או משלוח+איסוף עצמי (כולל דירוג המוכר)
router.get("/seller-delivery-options/:productId", async (req, res) => {
  const { productId } = req.params;

  try {
    const conn = await db.getConnection();

    const [rows] = await conn.execute(
      `SELECT 
         u.delivery_options AS option_value,
         u.city, 
         u.street, 
         u.house_number, 
         u.apartment_number, 
         u.zip, 
         u.country,
         u.rating,
       u.first_name,
        u.last_name,
        u.email       AS seller_email,
        u.phone       AS seller_phone
       FROM product p
       JOIN users u ON u.id_number = p.seller_id_number
       WHERE p.product_id = ?`,
      [productId]
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ option: "delivery", pickupAddress: null, rating: 0 });
    }

    const r = rows[0];

    const raw = (r.option_value || "delivery").toString().trim().toLowerCase();
    const option =
      raw === "delivery+pickup" || raw === "delivery_pickup"
        ? "delivery+pickup"
        : "delivery";

    let pickupAddress = null;
    if (option === "delivery+pickup") {
      pickupAddress = {
        city: r.city || "",
        street: r.street || "",
        house_number: r.house_number || "",
        apartment_number: r.apartment_number || "",
        zip: r.zip || "",
        country: r.country || "",
      };
      const allEmpty = Object.values(pickupAddress).every(
        (v) => !String(v || "").trim()
      );
      if (allEmpty) pickupAddress = null;
    }

    const rating = typeof r.rating === "number" ? r.rating : Number(r.rating) || 0;

  const sellerContact = {
     name: [r.first_name, r.last_name].filter(Boolean).join(" ").trim() || null,
     email: r.seller_email || null,
     phone: r.seller_phone || null,
  };

  return res.json({ option, pickupAddress, rating, sellerContact });
  } catch (err) {
    console.error("שגיאה בבדיקת אפשרויות משלוח/איסוף:", err);
    return res
      .status(500)
    .json({ option: "delivery", pickupAddress: null, rating: 0, sellerContact: null });
  }
});


// הוספת מוצר חדש
router.post("/", upload.array("images", 5), async (req, res) => {
  const {
    product_name,
    start_date,
    end_time,
    price,
    description,
    seller_id_number,
    product_status,
    category_id,
    subcategory_id,
    bid_increment,
    vat_included,
  } = req.body;
  console.log("start_date:", start_date); // צריך להיות בפורמט ISO כמו 2025-08-07T14:00
    console.log("end_time:", end_time); // צריך להיות בפורמט של זמן 00:10:00 נניח

  let finalPrice = parseFloat(price);
  let priceBeforeVat = null;
  const isVatIncluded = vat_included === "true";

  if (!isVatIncluded) {
    priceBeforeVat = finalPrice;
    finalPrice = priceBeforeVat * 1.17;
  } else {
    priceBeforeVat = finalPrice / 1.17;
  }

  finalPrice = Number(finalPrice.toFixed(2));
  priceBeforeVat = Number(priceBeforeVat.toFixed(2));

  const files = req.files;

  // בדיקות תקינות שדות
  if (!product_name || product_name.trim() === "") {
    return res
      .status(400)
      .json({ success: false, message: "שם המוצר הוא שדה חובה" });
  }

  if (!start_date) {
    return res
      .status(400)
      .json({ success: false, message: "תאריך התחלה הוא שדה חובה" });
  }

  const startDateObj = new Date(start_date);
  if (isNaN(startDateObj.getTime())) {
    return res
      .status(400)
      .json({ success: false, message: "תאריך/שעת התחלה לא תקין" });
  }

  if (startDateObj < new Date()) {
    return res.status(400).json({
      success: false,
      message: "תאריך ההתחלה חייב להיות מתאריך ושעה נוכחיים ואילך",
    });
  }

  if (!end_time) {
    return res
      .status(400)
      .json({ success: false, message: "זמן מכירה לא מלא" });
  }




  if (!price || isNaN(price)) {
    return res.status(400).json({
      success: false,
      message: "מחיר הוא שדה חובה וצריך להיות מספר",
    });
  }

  if (!bid_increment || isNaN(bid_increment)) {
    return res.status(400).json({
      success: false,
      message: "יש לבחור סכום עליית הצעה תקין",
    });
  }

  const conn = await db.getConnection();
  await conn.beginTransaction();

  try {
    const [result] = await conn.execute(
      `INSERT INTO product (
        product_name,
        start_date,
        end_time,
        price,
        current_price,
        price_before_vat,
        description,
        seller_id_number,
        product_status,
        category_id,
        subcategory_id,
        bid_increment
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        product_name,
        start_date,
        end_time,
        finalPrice,
        finalPrice,
        priceBeforeVat,
        description || null,
        seller_id_number,
        product_status,
        category_id || null,
        subcategory_id || null,
        parseInt(bid_increment) || 10,
      ]
    );

    const productId = result.insertId;

    for (const file of files) {
      const imagePath = "/uploads/" + file.filename;
      await conn.execute(
        "INSERT INTO product_images (product_id, image_url) VALUES (?, ?)",
        [productId, imagePath]
      );
    }

    console.log("קבצים שהתקבלו:", req.files);
    await conn.commit();
    res.json({ success: true });
  } catch (error) {
    await conn.rollback();
    console.error("שגיאה בהעלאת מוצר:", error);
    res.status(500).json({ success: false, message: "שגיאה בהעלאת מוצר" });
  }
});

// שליפת מוצר בודד לפי product_id
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const conn = await db.getConnection();

    // שליפת פרטי המוצר
    const [rows] = await conn.execute(
      "SELECT * FROM product WHERE product_id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "המוצר לא נמצא" });
    }

    const product = rows[0];

    //  כאן מוסיפים שליפת תמונות
    const [images] = await conn.execute(
      "SELECT image_url FROM product_images WHERE product_id = ?",
      [id]
    );

    product.images = images.map((img) => img.image_url); // מוסיף שדה images עם מערך כתובות תמונה

    res.json(product); 
  } catch (err) {
    console.error(" שגיאה בשרת בשליפת מוצר:", err.message);
    res.status(500).json({ message: "שגיאה בשרת" });
  }
});


async function withConn(run) {
  const conn = await db.getConnection();
  try {
    return await run(conn);
  } finally {
    // אם זה חיבור שהגיע מ-POOL יש מתחתיו connection.release
     safeRelease(conn);
    // אם זה חיבור גלובלי (createConnection) – אל תסגרי אותו כאן! (אל תקראי end)
  }
}


// --- הוסיפו פעם אחת בקובץ (ליד withConn) ---
function safeRelease(_conn) {
  try {
    if (!conn) return;
    // חיבור מ־POOL: יש חיבור תחתון עם release
    if (conn.connection && typeof conn.connection.release === "function") {
      // גם conn.release וגם conn.connection.release יעבדו כאן
      conn.release();
      return;
    }
    // חיבור בודד (createConnection): סוגרים עם end()
    if (typeof conn.end === "function") {
      conn.end();
    }
  } catch (e) {
    // שקט
  }
}


// ---- מנהל בלבד ----
function ensureAdmin(req, res, next) {
  const u = req.session?.user;
  if (!u || u.role !== "admin") {
    return res.status(403).json({ success: false, message: "Admin only" });
  }
  next();
}

// GET /api/product/admin/:id
router.get("/admin/:id", ensureAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const conn = await db.getConnection();

    const [rows] = await conn.execute(
      `SELECT 
         p.*,
         u.id_number         AS seller_id_number,
         u.first_name        AS seller_first_name,
         u.last_name         AS seller_last_name,
         u.email             AS seller_email,
         u.phone             AS seller_phone,
         u.status            AS seller_status,
         u.rating            AS seller_rating
       FROM product p
       JOIN users u ON u.id_number = p.seller_id_number
       WHERE p.product_id = ?
       LIMIT 1`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "מוצר לא נמצא" });
    }

    const product = rows[0];

    // תמונות
    const [images] = await conn.execute(
      "SELECT image_url FROM product_images WHERE product_id = ?",
      [id]
    );
    product.images = images.map(i => i.image_url);

    // אריזה נוחה לפרונט
    const seller = {
      id_number: product.seller_id_number,
      first_name: product.seller_first_name,
      last_name: product.seller_last_name,
      email: product.seller_email,
      phone: product.seller_phone,
      status: product.seller_status,
      rating: product.seller_rating ?? 0,
    };

    return res.json({ success: true, product, seller });
  } catch (e) {
    console.error("GET /api/product/admin/:id error:", e);
    return res.status(500).json({ success: false, message: "DB error" });
  }
});



// ---- הרשאה: רק אדמין או המוכר של המוצר ----
async function ensureOwnerOrAdmin(req, res, next) {
  try {
    const user = req.session?.user;
    if (!user) return res.status(401).json({ message: "לא מחובר" });

    if (user.role === "admin") return next();

    const { id } = req.params;
    const [rows] = await withConn((conn) =>
      conn.execute("SELECT seller_id_number FROM product WHERE product_id = ?", [id])
    );
    if (!rows.length) return res.status(404).json({ message: "מוצר לא נמצא" });

    const isOwner = user.role === "seller" &&
      String(user.id_number) === String(rows[0].seller_id_number);

    if (!isOwner) return res.status(403).json({ message: "אין הרשאה" });
    next();
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "שגיאה בהרשאה" });
  }
}

// ---- חסימת עדכון מוצר אם לא למכירה ----
async function assertEditable(req, res, next) {
  try {
    const { id } = req.params;
    const [rows] = await withConn((conn) =>
      conn.execute("SELECT product_status FROM product WHERE product_id = ?", [id])
    );
    if (!rows.length) return res.status(404).json({ message: "מוצר לא נמצא" });

    const status = String(rows[0].product_status || "").toLowerCase();
    if (status !== "for sale") {
      return res.status(409).json({ message: "לא ניתן לערוך מוצר שאינו 'for sale'" });
    }
    next();
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "שגיאה בבדיקת סטטוס" });
  }
}


// פרסום מחדש (Relist) של מוצר שלא נמכר – יוצר מוצר חדש עם אותם פרטים ותמונות
// נתיב לקוח: POST /api/product/product/:id/relist
// פרסום מחדש (Relist) של מוצר שלא נמכר – יוצר מוצר חדש עם אותם פרטים ותמונות
// נתיב לקוח: POST /api/product/product/:id/relist
router.post("/product/:id/relist", ensureOwnerOrAdmin, async (req, res) => {
  const originalId = Number(req.params.id);
  if (!originalId) {
    return res.status(400).json({ success: false, message: "מזהה מוצר מקורי חסר/לא תקין" });
  }

  // שדות נכנסים (JSON) – כמו הוספה רגילה
  const {
    product_name,
    start_date,      // "YYYY-MM-DDTHH:MM"
    end_time,        // "HH:MM" או "HH:MM:SS"
    price,
    description,
    category_id,
    subcategory_id,
    bid_increment,
    vat_included,    // "true"/"false"
    copy_images = "true", // "true"/"false"
  } = req.body || {};

  // ולידציה בסיסית (דומה להוספה)
  if (!product_name || product_name.trim() === "") {
    return res.status(400).json({ success: false, message: "שם המוצר הוא שדה חובה" });
  }
  if (!start_date) {
    return res.status(400).json({ success: false, message: "תאריך התחלה הוא שדה חובה" });
  }
  const startDateObj = new Date(start_date);
  if (isNaN(startDateObj.getTime())) {
    return res.status(400).json({ success: false, message: "תאריך/שעת התחלה לא תקין" });
  }
  if (startDateObj < new Date()) {
    return res.status(400).json({
      success: false,
      message: "תאריך ההתחלה חייב להיות מתאריך ושעה נוכחיים ואילך",
    });
  }
  if (!end_time) {
    return res.status(400).json({ success: false, message: "זמן מכירה לא מלא" });
  }
  if (!price || isNaN(price)) {
    return res.status(400).json({ success: false, message: "מחיר הוא שדה חובה וצריך להיות מספר" });
  }
  if (!bid_increment || isNaN(bid_increment)) {
    return res.status(400).json({ success: false, message: "יש לבחור סכום עליית הצעה תקין" });
  }
  // צעדי הצעה מותרים בלבד
  const ALLOWED_BID_STEPS = [10, 20, 50, 100, 500, 1000];
  if (!ALLOWED_BID_STEPS.includes(Number(bid_increment))) {
    return res.status(400).json({
      success: false,
      message: `סכום עליית הצעה חייב להיות אחד מהבאים: ${ALLOWED_BID_STEPS.join("/")}`,
    });
  }

  // חישובי מע"מ – כמו בהוספה
  let finalPrice = parseFloat(price);
  let priceBeforeVat = null;
  const isVatIncluded = String(vat_included) === "true";
  if (!isVatIncluded) {
    priceBeforeVat = finalPrice;
    finalPrice = priceBeforeVat * 1.17;
  } else {
    priceBeforeVat = finalPrice / 1.17;
  }
  finalPrice = Number(finalPrice.toFixed(2));
  priceBeforeVat = Number(priceBeforeVat.toFixed(2));

  let conn;
  try {
    conn = await db.getConnection();             // ✅ בתוך try
    await conn.beginTransaction();

    // שליפת המוצר המקורי + נעילה
    const [origRows] = await conn.execute(
      "SELECT * FROM product WHERE product_id = ? FOR UPDATE",
      [originalId]
    );
    if (!origRows.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: "מוצר מקורי לא נמצא" });
    }
    const original = origRows[0];

    // Relist אפשרי רק מ-not sold
    const status = String(original.product_status || "").trim().toLowerCase();
    if (status !== "not sold" && status !== "not_sold") {
      await conn.rollback();
      return res.status(409).json({ success: false, message: "ניתן לפרסם מחדש רק מוצר במצב Not sold" });
    }

    // נירמול זמן לסקונדות
    const normalizedEnd = end_time.length === 5 ? `${end_time}:00` : end_time;

    // יצירה של מוצר חדש (אותו מוכר; סטטוס התחלתי 'for sale'; איפוסי ריצה)
    const [insertRes] = await conn.execute(
      `INSERT INTO product (
        product_name,
        start_date,
        end_time,
        price,
        current_price,
        price_before_vat,
        description,
        seller_id_number,
        product_status,
        category_id,
        subcategory_id,
        bid_increment,
        is_live,
        winner_id_number,
        last_bid_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        product_name,
        start_date,                     // נשמר בפורמט ISO שהגיע מהלקוח
        normalizedEnd,                  // "HH:MM:SS"
        finalPrice,
        finalPrice,
        priceBeforeVat,
        description || null,
        original.seller_id_number,      // מוכר זהה למקורי
        "for sale",                     // Relist מתחיל כ-for sale
        category_id || null,
        subcategory_id || null,
        parseInt(bid_increment) || 10,
        0,                              // is_live
        null,                           // winner_id_number
        null                            // last_bid_time
      ]
    );

    const newProductId = insertRes.insertId;

    // העתקת תמונות קיימות (ברירת מחדל: כן)
    const shouldCopy = String(copy_images).toLowerCase() !== "false";
    if (shouldCopy) {
      await conn.execute(
        `INSERT INTO product_images (product_id, image_url)
         SELECT ?, image_url FROM product_images WHERE product_id = ?`,
        [newProductId, originalId]
      );
    }

    await conn.commit();
    return res.json({ success: true, new_product_id: newProductId });
  } catch (e) {
    if (conn) { try { await conn.rollback(); } catch {} }
    console.error("שגיאה ב-Relist:", e);
    return res.status(500).json({ success: false, message: "שגיאה בפרסום מחדש" });
  } finally {
     safeRelease(conn);

  }
});




// עדכון מוצר (עם בדיקת הרשאה + מניעת עדכון אם נמכר/לא-נמכר)
router.put("/product/:id", ensureOwnerOrAdmin, assertEditable, async (req, res) => {
  const productId = req.params.id;
  let {
    product_name,
    price,
    current_price,
    category_id,
    subcategory_id,
    description,
    start_date,   // "YYYY-MM-DDTHH:MM"
    end_time,     // "HH:MM:SS" או "HH:MM"
    price_before_vat,
  } = req.body;

  const normalizedStart = start_date ? start_date.replace("T", " ") + ":00" : null;
  const normalizedEnd   = end_time ? (end_time.length === 5 ? end_time + ":00" : end_time) : null;

  try {
    await withConn((conn) =>
      conn.execute(
        `UPDATE product SET 
          product_name     = COALESCE(?, product_name),
          price            = COALESCE(?, price),
          current_price    = COALESCE(?, current_price),
          category_id      = COALESCE(?, category_id),
          subcategory_id   = COALESCE(?, subcategory_id),
          description      = COALESCE(?, description),
          start_date       = COALESCE(?, start_date),
          end_time         = COALESCE(?, end_time),
          price_before_vat = COALESCE(?, price_before_vat)
        WHERE product_id = ?`,
        [
          product_name,
          price,
          current_price,
          category_id,
          subcategory_id,
          description,
          normalizedStart,
          normalizedEnd,
          price_before_vat,
          productId,
        ]
      )
    );
    res.json({ success: true });
  } catch (err) {
    console.error("שגיאה בעדכון מוצר:", err);
    res.status(500).json({ success: false, message: "שגיאה בעדכון מוצר" });
  }
});


// העלאת תמונה
router.post("/product/:id/images", ensureOwnerOrAdmin, assertEditable, upload.single("image"), async (req, res) => {
  try {
    const { id } = req.params;
    const file = req.file;
    if (!file) return res.status(400).json({ message: "לא התקבלה תמונה" });

    const url = `/uploads/${file.filename}`;
    await withConn((conn) =>
      conn.execute("INSERT INTO product_images (product_id, image_url) VALUES (?, ?)", [id, url])
    );
    res.json({ success: true, image_url: url });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "שגיאה בהעלאת תמונה" });
  }
});

// מחיקת תמונה
router.delete("/product/:id/images", ensureOwnerOrAdmin, assertEditable, async (req, res) => {
  try {
    const { id } = req.params;
    const { image_url } = req.body;
    if (!image_url) return res.status(400).json({ message: "image_url חסר" });

    const [rows] = await withConn((conn) =>
      conn.execute(
        "SELECT image_id FROM product_images WHERE product_id = ? AND image_url = ?",
        [id, image_url]
      )
    );
    if (!rows.length) return res.status(404).json({ message: "תמונה לא נמצאה למוצר" });

    // מחיקת קובץ מהדיסק (לא נכשלים אם אינו קיים)
    const fsPath = path.join(process.cwd(), image_url.replace(/^\//, ""));
    fs.unlink(fsPath, () => {});

    await withConn((conn) =>
      conn.execute("DELETE FROM product_images WHERE product_id = ? AND image_url = ?", [id, image_url])
    );
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "שגיאה במחיקת תמונה" });
  }
});

// מסמן מוצר כ-Not sold אם עברו 24 שעות מאז הזכייה והזוכה לא שילם
router.post("/expire-unpaid", async (req, res) => {
  try {
    const { product_id } = req.body;
    if (!product_id) {
      return res.status(400).json({ success: false, message: "חסר product_id" });
    }

    const conn = await db.getConnection();

    // שולפים product עם last_bid_time & winner_id_number
    const [pRows] = await conn.query(
      `SELECT product_id, winner_id_number, last_bid_time, product_status
       FROM product WHERE product_id = ? LIMIT 1`,
      [product_id]
    );
    if (!pRows.length) {
      return res.status(404).json({ success: false, message: "מוצר לא נמצא" });
    }
    const p = pRows[0];

    if (!p.winner_id_number || !p.last_bid_time) {
      return res.json({ success: true, updated: false, reason: "אין זוכה/אין last_bid_time" });
    }

    const lastBidMs  = new Date(p.last_bid_time).getTime();
    const deadlineMs = lastBidMs + 24 * 60 * 60 * 1000;

    if (Date.now() < deadlineMs) {
      return res.json({ success: true, updated: false, reason: "טרם עברו 24 שעות" });
    }

    // בודקים ב-quotation שהזוכה עדיין 'לא שילם'
    const [qRows] = await conn.query(
      `SELECT is_paid 
         FROM quotation 
        WHERE product_id = ? AND buyer_id_number = ? 
        ORDER BY quotation_id DESC
        LIMIT 1`,
      [product_id, p.winner_id_number]
    );

    const unpaid = qRows.length &&
      (String(qRows[0].is_paid).toLowerCase() === "no" ||
       String(qRows[0].is_paid) === "0" ||
       qRows[0].is_paid === 0 ||
       qRows[0].is_paid === false);

    if (!unpaid) {
      return res.json({ success: true, updated: false, reason: "שולם / לא נמצא unpaid" });
    }

    // הגיע המועד והזוכה לא שילם → מסמנים Not sold
    await conn.query(
      `UPDATE product 
          SET product_status = 'Not sold'
        WHERE product_id = ?`,
      [product_id]
    );

    return res.json({ success: true, updated: true, product_status: "Not sold" });
  } catch (err) {
    console.error("❌ expire-unpaid error:", err.message);
    return res.status(500).json({ success: false, message: "שגיאה בשרת" });
  }
});



// ──────────────────────────────────────────────
// ביטול מכירה: product_status => 'blocked',
// מחיקת כל ההצעות, ושליחת מייל לכל הנרשמים/מציעים
// נתיב בצד-לקוח: POST /api/product/product/:id/cancel
// ──────────────────────────────────────────────

router.post("/product/:id/cancel", ensureOwnerOrAdmin, async (req, res) => {
  const { id } = req.params;
  const { reason = "" } = req.body || {};
  const user = req.session?.user; // ← מי יזם
  const initiator = user?.role === "admin" ? "admin" : "seller";

  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const [prodRows] = await conn.execute(
      "SELECT product_id, product_name, product_status, start_date FROM product WHERE product_id = ? FOR UPDATE",
      [id]
    );
    if (!prodRows.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: "מוצר לא נמצא" });
    }
    const product = prodRows[0];
    const niceStart = formatHebDateTime(product.start_date);

    // כל מי שהגיש/נרשם להצעות
    const [mailRows] = await conn.execute(
      `SELECT DISTINCT u.email
         FROM quotation q
         JOIN users u ON u.id_number = q.buyer_id_number
        WHERE q.product_id = ?`,
      [id]
    );
    const emails = mailRows.map(r => r.email).filter(Boolean);

    // 👇 כאן השינוי: סטטוס שונה לפי יוזם הפעולה
    const newStatus = initiator === "admin" ? "admin blocked" : "blocked";

    // חסימה/ביטול ומחיקת הצעות
    await conn.execute(
      "UPDATE product SET product_status = ? WHERE product_id = ?",
      [newStatus, id]
    );
    await conn.execute("DELETE FROM quotation WHERE product_id = ?", [id]);

    await conn.commit();

    // --- שליחת מיילים לקונים שנרשמו/הציעו ---
    if (emails.length > 0) {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: "bidsmart2025@gmail.com",
          pass: "zjkkgwzmwjjtcylr",
        },
      });

      const subject =
        initiator === "admin"
          ? "עדכון: המוצר אינו זמין למכירה"
          : "עדכון: המכירה הפומבית בוטלה";

      const text =
        initiator === "admin"
          ? `שלום,\nהמוצר "${product.product_name}" נחסם על ידי הנהלת BidSmart ולכן אינו זמין למכירה. כל ההרשמות וההצעות בוטלו.\n${reason ? `\nהערת הנהלה: ${reason}\n` : ""}\nצוות BidSmart`
          : `שלום,\nהמכירה הפומבית של המוצר "${product.product_name}" שהייתה אמורה להתקיים בתאריך ${niceStart} בוטלה על ידי בעל המוצר.\nאנו מתנצלים על חוסר הנוחות.\n\nצוות BidSmart`;

      const mailOptions = {
        from: "BidSmart <bidsmart2025@gmail.com>",
        bcc: emails.join(","),
        subject,
        text,
      };

      transporter.sendMail(mailOptions, (err, info) => {
        if (err) console.error("שגיאה בשליחת מיילי ביטול:", err);
        else console.log("מייל ביטול נשלח:", info.response);
      });
    }

    return res.json({
      success: true,
      message:
        initiator === "admin"
          ? "המוצר נחסם, ההצעות נמחקו ונשלחה הודעה לנרשמים."
          : "המכירה בוטלה, ההצעות נמחקו ונשלחו מיילים למשתתפים.",
      notified: emails.length,
      initiator,
      status: newStatus, // אופציונלי: מחזיר ללקוח את הסטטוס החדש
    });
  } catch (e) {
    console.error("שגיאה בביטול/חסימה:", e);
    try { await conn.rollback(); } catch {}
    return res.status(500).json({ success: false, message: "שגיאה בביטול מכירה" });
  } finally {
    safeRelease(conn);
  }
});






function formatHebDateTime(dt, tz = "Asia/Jerusalem") {
  const d = new Date(dt);
  const date = d.toLocaleDateString("he-IL", { timeZone: tz });
  const time = d.toLocaleTimeString("he-IL", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date} בשעה ${time}`;
}


module.exports = router;
