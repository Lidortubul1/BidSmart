// src/pages/ProductPage/utils/datetime.js
export function formatDateTimeHe(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const date = d.toLocaleDateString("he-IL");
  const time = d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  return `${date} בשעה ${time}`;
}
export function formatDate(isoDate) {
  const d = new Date(isoDate);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}
export function formatTime(isoDate) {
  const d = new Date(isoDate);
  return d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}
