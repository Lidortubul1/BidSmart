// src/pages/ProductPage/utils/time.js
export function parseDurationToMs(timeStr) {
  if (timeStr == null) return null;
  const parts = String(timeStr).trim().split(":").map(Number);
  if (parts.some(Number.isNaN)) return null;
  let h = 0, m = 0, s = 0;
  if (parts.length === 3) [h, m, s] = parts;
  else if (parts.length === 2) [h, m] = parts;
  else m = parts[0];
  return (h * 3600 + m * 60 + s) * 1000;
}
export function formatCountdown(total) {
  if (total == null) return "";
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const base = `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  return d > 0 ? `${d} ימים ${base}` : base;
}
export function durationToMinutesDisplay(timeStr) {
  const ms = parseDurationToMs(timeStr);
  return ms == null ? "" : String(Math.round(ms / 60000));
}
