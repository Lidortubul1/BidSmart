// src/pages/ProductPage/utils/datetime.js
// datetime.js: פונקציות שירות לעיצוב תאריכים ושעות בעברית  
// `formatDateTimeHe` – ממיר ISO לטקסט מלא "DD/MM/YYYY בשעה HH:MM"  
// `formatDate` – מחזיר רק תאריך בפורמט "DD/MM/YYYY"  
// `formatTime` – מחזיר רק שעה בפורמט "HH:MM"  
// `todayStr` – מחזיר תאריך היום בפורמט "YYYY-MM-DD" (לטפסי date)  
// `nowTimeStr` – מחזיר שעה נוכחית בפורמט "HH:MM" (לטפסי time)

// מעצב תאריך־ושעה ממחרוזת ISO לתצוגה "DD/MM/YYYY בשעה HH:MM" בעברית
export function formatDateTimeHe(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const date = d.toLocaleDateString("he-IL");
  const time = d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  return `${date} בשעה ${time}`;
}

// מעצב תאריך ממחרוזת ISO לפורמט "DD/MM/YYYY"
export function formatDate(isoDate) {
  const d = new Date(isoDate);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// מעצב שעה ממחרוזת ISO לפורמט "HH:MM" בעברית
export function formatTime(isoDate) {
  const d = new Date(isoDate);
  return d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}

// מחזיר את תאריך היום בפורמט "YYYY-MM-DD" לשדות תאריך
export function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// מחזיר את השעה הנוכחית בפורמט "HH:MM" לשדות שעה
export function nowTimeStr() {
  const d = new Date();
  d.setSeconds(0, 0);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}
