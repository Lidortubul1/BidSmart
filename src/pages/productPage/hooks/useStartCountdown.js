// src/pages/ProductPage/hooks/useStartCountdown.js
// useStartCountdown: הוק שמחשב ומחזיר שניות עד תחילת מכירה לפי תאריך התחלה (startIso). אם אין startIso מוחזר null. מתעדכן כל שנייה באמצעות setInterval, ומפסיק ספירה כשהמכירה התחילה (ערך 0).

import { useEffect, useState } from "react";

// הוק שמחזיר ספירה לאחור בשניות עד לזמן התחלה נתון (startIso), מתעדכן כל שנייה ומחזיר null אם אין תאריך
export function useStartCountdown(startIso) {
  const [sec, setSec] = useState(null);

  useEffect(() => {
    if (!startIso) { setSec(null); return; }
    const start = new Date(startIso).getTime();

    const tick = () => setSec(Math.max(Math.floor((start - Date.now()) / 1000), 0));
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [startIso]);

  return sec;
}
