// /src/pages/LiveAuction/components/TimerBar.jsx
import styles from "../LiveAuction.module.css";

export default function TimerBar({ value = 0, max = 15 }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const hue = Math.round((value / max) * 120);          // 120=ירוק → 0=אדום
  const fillColor = `hsl(${hue} 90% 40%)`;

  return (
    <div className={styles.timerWrap} aria-label="טיימר סבב">
      <div className={styles.timerBar}>
        <div
          className={styles.timerFill}
          style={{
            width: `${pct}%`,
            backgroundColor: fillColor,       // חשוב: backgroundColor (לא background)
          }}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={max}
          aria-valuenow={value}
        />
      </div>
    </div>
  );
}
