// src/utils/exportProductsToExcel.js
// מייצא את רשימת המוצרים שמוצגת כרגע לקובץ .xlsx 
// כולל עמודות: מזהה, שם, קטגוריה, תת־קטגוריה, תאריכים, שעה, סטטוס ומחיר נוכחי
// אם הצופה הוא admin יתווסף גם שם המוכר
// שם הקובץ נבנה לפי סוג הצופה (my-products / all-products), תיאור פילטר אופציונלי ותאריך היום

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

/**
 * מייצא רשימת מוצרים לאקסל.
 * @param {Array<object>} rows - המוצרים אחרי סינון/חיפוש (מה שמוצג כרגע).
 * @param {Object} opts
 * @param {'seller'|'admin'} [opts.viewer='seller'] - מי צופה (מוכר/מנהל).
 * @param {string} [opts.filterLabel=''] - תיאור הפילטר (לשם הקובץ).
 */
export function exportProductsToExcel(rows, { viewer = "seller", filterLabel = "" } = {}) {
  const f = (iso) => (iso ? new Date(iso).toLocaleDateString("he-IL") : "-");
  const t = (iso) => (iso ? new Date(iso).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }) : "-");

  const data = rows.map((p) => ({
    "מזהה": p.product_id,
    "שם מוצר": p.product_name ?? "",
    ...(viewer === "admin" ? { "מוכר": p.seller_name ?? "" } : {}),
    "קטגוריה": p.category_name ?? "",
    "תת קטגוריה": p.subcategory_name ?? "",
    "תאריך התחלה": f(p.start_date),
    "שעת התחלה": t(p.start_date),
    "סטטוס": p.product_status ?? p.status ?? "",
    "מחיר נוכחי": p.current_price ?? "",
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "מוצרים");

  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });

  const today = new Date().toISOString().slice(0, 10);
  const prefix = viewer === "admin" ? "all-products" : "my-products";
  const filterPart = filterLabel ? `_${filterLabel.replace(/\s+/g, "-")}` : "";
  const filename = `${prefix}${filterPart}_${today}.xlsx`;

  saveAs(
    new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    filename
  );
}
