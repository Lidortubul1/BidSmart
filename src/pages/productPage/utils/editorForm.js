// src/pages/ProductPage/utils/editForm.js


// בונה אובייקט נתונים לשליחה לשרת מתוך ערכי הטופס, כולל חישוב מחיר לפני/כולל מע״מ וסכום עליית הצעה
export function buildPayload(state) {
  const {
    product_name,
    description,
    category_id,
    subcategory_id,
    datePart,
    timePart,
    endTime,
    priceMode,
    priceGross,
    priceNet,
    bidIncrement,
  } = state;

  const payload = {
    product_name,
    description,
    category_id,
    subcategory_id,
    start_date: `${datePart}T${timePart}`,
    end_time: `${endTime}:00`,
  };

  if (priceMode === "gross") {
    const inc = Number(priceGross);
    const pre = +(inc / 1.17).toFixed(2);
    payload.price = inc;
    payload.current_price = inc;
    payload.price_before_vat = pre;
    payload.vat_included = "true";
  } else {
    const pre = Number(priceNet);
    const inc = +(pre * 1.17).toFixed(2);
    payload.price_before_vat = pre;
    payload.price = inc;
    payload.current_price = inc;
    payload.vat_included = "false";
  }

  payload.vat_included = priceMode === "gross" ? "true" : "false";
  payload.bid_increment = Number(bidIncrement) || 10;

  return payload;
}

// מאמת את שדות הטופס הנדרשים ומחזירה מחרוזת שגיאה בעברית או ערך ריק אם הכול תקין
export function validateRequired(state, BID_STEPS) {
  const {
    product_name,
    description,
    category_id,
    subcategory_id,
    datePart,
    timePart,
    endTime,
    priceMode,
    priceGross,
    priceNet,
    bidIncrement,
  } = state;

  if (!product_name.trim()) return "שם מוצר חובה";
  if (!description.trim()) return "תיאור חובה";
  if (!category_id) return "יש לבחור קטגוריה";
  if (!subcategory_id) return "יש לבחור תת־קטגוריה";
  if (!datePart) return "יש לבחור תאריך התחלה";
  if (!timePart) return "יש לבחור שעת התחלה";
  if (!endTime) return "יש לבחור זמן מכירה (HH:MM)";

  if (priceMode === "gross") {
    if (!priceGross) return "יש להזין מחיר כולל מע״מ";
    if (Number(priceGross) <= 0) return "מחיר כולל מע״מ חייב להיות גדול מאפס";
  } else {
    if (!priceNet) return "יש להזין מחיר לפני מע״מ";
    if (Number(priceNet) <= 0) return "מחיר לפני מע״מ חייב להיות גדול מאפס";
  }

  if (!BID_STEPS.includes(Number(bidIncrement))) {
    return `סכום עליית הצעה חייב להיות אחד מהבאים: ${BID_STEPS.join("/")}`;
  }

  const startIso = `${datePart}T${timePart}:00`;
  const startMs = new Date(startIso).getTime();
  const nowMs = Date.now();
  if (!Number.isFinite(startMs)) return "תאריך/שעת התחלה לא תקינים";
  if (startMs < nowMs) return "תאריך/שעת התחלה לא יכולים להיות בעבר";

  return null;
}
