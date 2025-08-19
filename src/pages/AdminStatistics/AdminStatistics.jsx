import { useEffect, useState } from "react";
import styles from "./AdminStatistics.module.css";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";

import {
  getAdminStats,
  // getRegistrationsByMonth,  // הוסר: לא משתמשים יותר בגרסה הזו
  getSalesByMonth,
  getRevenue,
  getBidsActivity,
  getSalesByCategory,
  getTopSellers,
  getAuctionFunnel,
  getSellersList,
 getRegistrationsRange,  // חדש: הרשמות לפי טווח וקיבוץ
} from "../../services/adminApi";
import CustomModal from "../../components/CustomModal/CustomModal"

function AdminStatistics() {
  // ----- מסננים גלובליים (לקבוצת האנליטיקות) -----
  const [from, setFrom] = useState(() =>
    new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10)
  );
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [group, setGroup] = useState("month"); // day | month

  // סינון לפי מוכר (לא נוגע להרשמות)
  const [sellerId, setSellerId] = useState("");
  const [sellers, setSellers] = useState([]); // [{id_number, first_name, last_name}]

  // ----- סטטוס כללי -----
const [stats, setStats] = useState({
  totalSellers: 0,
  totalUsers: 0,
  deliveredSales: 0,
  undeliveredSales: 0,
  upcomingProducts: 0,
  unsoldProducts: 0,
  blockedUsers: 0,
  soldProducts: 0,  
});

  // ----- גרפים תלויי טווח (קבוצת אנליטיקות) -----
  const [registrations, setRegistrations] = useState([]); // 👈 חדש
  const [salesByMonthData, setSalesByMonthData] = useState([]);
  const [revenue, setRevenue] = useState([]);
  const [bidsActivity, setBidsActivity] = useState([]);
  const [salesByCategory, setSalesByCategory] = useState([]);
  const [topSellers, setTopSellers] = useState([]);
  const [funnel, setFunnel] = useState({
    started: 0,
    sold: 0,
    not_sold: 0,
    conversion: 0,
  });
// 🔽 סטייט למודאל + עוזרים
const [modalOpen, setModalOpen] = useState(false);
const [modalTitle, setModalTitle] = useState("");
const [modalMessage, setModalMessage] = useState(null);

const openModal = (title, message) => {
  setModalTitle(title);
  setModalMessage(message);
  setModalOpen(true);
};
const closeModal = () => setModalOpen(false);

// פורמט עזר
const fmtInt = (v) => Number(v ?? 0).toLocaleString("he-IL");

// 🔽 בונה הודעת מודאל לפי סוג הגרף וה־payload שנלחץ
const openDetails = (kind, raw) => {
  const p = raw?.payload ?? raw; // Bar שולח payload, Pie שולח ישירות
  try {
    switch (kind) {

      case "usersBreakdown": {
        openModal("פילוח משתמשים", (
          <div>
            <p><b>פרמטר:</b> {p?.name}</p>
            <p><b>כמות:</b> {fmtInt(p?.value)}</p>
          </div>
        ));
        break;
      }

      case "shipStatus": {
        openModal("סטטוס משלוחים", (
          <div>
            <p><b>סטטוס:</b> {p?.name}</p>
            <p><b>כמות:</b> {fmtInt(p?.value)}</p>
          </div>
        ));
        break;
      }

      case "productsStatus": {
        openModal("מוצרים לפי סטטוס", (
          <div>
            <p><b>סטטוס:</b> {p?.name}</p>
            <p><b>כמות:</b> {fmtInt(p?.value)}</p>
          </div>
        ));
        break;
      }

      case "registrations": {
        openModal("הרשמות בטווח", (
          <div>
            <p><b>תקופה:</b> {fmtBucket(p?.bucket, group)}</p>
            <p><b>מס׳ הרשמות:</b> {fmtInt(p?.count)}</p>
          </div>
        ));
        break;
      }

      case "revenue": {
        openModal("הכנסות בטווח", (
          <div>
            <p><b>תקופה:</b> {fmtBucket(p?.bucket, group)}</p>
            <p><b>סה״כ מכירות:</b> {fmtCurrency(p?.total_sales)}</p>
            {"orders_count" in p && <p><b>מס׳ עסקאות:</b> {fmtInt(p.orders_count)}</p>}
            {"avg_order_value" in p && <p><b>ערך הזמנה ממוצע:</b> {fmtCurrency(p.avg_order_value)}</p>}
          </div>
        ));
        break;
      }

      case "salesByMonth": {
        openModal("סך מכירות לפי חודש", (
          <div>
            <p><b>חודש:</b> {monthYearLabel(p)}</p>
            <p><b>סה״כ מכירות:</b> {fmtCurrency(p?.total_sales)}</p>
          </div>
        ));
        break;
      }

      case "bidsActivity": {
        openModal("פעילות הצעות", (
          <div>
            <p><b>תקופה:</b> {fmtBucket(p?.bucket, group)}</p>
            <p><b>סה״כ הצעות:</b> {fmtInt(p?.total_bids)}</p>
            {"unique_bidders" in p && <p><b>מציעים ייחודיים:</b> {fmtInt(p.unique_bidders)}</p>}
            {"avg_bid_price" in p && <p><b>מחיר ממוצע להצעה:</b> {fmtCurrency(p.avg_bid_price)}</p>}
            {"max_bid_price" in p && <p><b>הצעה מקסימלית:</b> {fmtCurrency(p.max_bid_price)}</p>}
          </div>
        ));
        break;
      }

      case "salesByCategory": {
        openModal("מכירות לפי קטגוריה", (
          <div>
            <p><b>קטגוריה:</b> {p?.category}</p>
            <p><b>נמכרו (יח׳):</b> {fmtInt(p?.sold_count)}</p>
            <p><b>סה״כ מכירות:</b> {fmtCurrency(p?.total_sales)}</p>
          </div>
        ));
        break;
      }

      case "topSellers": {
        openModal("מוכרים מובילים", (
          <div>
            <p><b>מוכר:</b> {p?.seller_name}</p>
            <p><b>נמכרו (יח׳):</b> {fmtInt(p?.items_sold)}</p>
            <p><b>סה״כ מכירות:</b> {fmtCurrency(p?.total_sales)}</p>
          </div>
        ));
        break;
      }

      case "funnel": {
        openModal("נתוני מכירות", (
          <div>
            <p><b>שלב:</b> {p?.name}</p>
            <p><b>כמות:</b> {fmtInt(p?.value)}</p>
            <p><b>שיעור המרה כללי:</b> {fmtInt(funnel.conversion)}%</p>
          </div>
        ));
        break;
      }

      default:
        openModal("פרטים", JSON.stringify(p, null, 2));
    }
  } catch {
    openModal("פרטים", JSON.stringify(raw ?? {}, null, 2));
  }
};

  // ציר Y מיושר שמאלה
  const yAxisLeft = {
    orientation: "left",
    width: 56,
    tickMargin: 20,
    tick: { dx: -10 },
    allowDecimals: false,
  };

  // ------ פורמטים יפים לתאריכים ------
  const fmtDay = (iso) => {
    const d = new Date(iso);
    if (Number.isNaN(d)) return iso;
    return new Intl.DateTimeFormat("he-IL", { day: "2-digit", month: "short" }).format(d);
  };
  const fmtMonth = (ym) => {
    const d = new Date((ym?.length === 7 ? ym + "-01" : ym) || "");
    if (Number.isNaN(d)) return ym;
    return new Intl.DateTimeFormat("he-IL", { month: "short", year: "2-digit" }).format(d);
  };
  const fmtBucket = (bucket, g) => (g === "day" ? fmtDay(bucket) : fmtMonth(bucket));
  const monthYearLabel = (entry) =>
    fmtMonth(`${entry.year}-${String(entry.month).padStart(2, "0")}`);
  const fmtCurrency = (v) => `${Number(v).toLocaleString("he-IL")} ₪`;

  // ----- טעינה חד־פעמית של סטטוס כללי -----
  useEffect(() => {
    (async () => {
      const data = await getAdminStats();
      if (data) setStats(data);
    })();
  }, []);

  // ----- הבאת רשימת מוכרים לקומבובוקס -----
  useEffect(() => {
    (async () => {
      const list = await getSellersList();
      setSellers(list);
    })();
  }, []);

  // ----- טעינת אנליטיקות לפי טווח/קיבוץ + מוכר -----
  useEffect(() => {
    (async () => {
      const sellerParam = sellerId || undefined;

      // הרשמות לפי טווח/קיבוץ (לא מסונן לפי מוכר)
      setRegistrations(await getRegistrationsRange({ from, to, group }));

      // שאר הגרפים (כן תומכים בסינון מוכר)
      setRevenue(await getRevenue({ from, to, group, seller_id_number: sellerParam }));
      setSalesByMonthData(await getSalesByMonth({ from, to, seller_id_number: sellerParam }));
      setBidsActivity(
        await getBidsActivity({ from, to, group: group === "day" ? "day" : "month", seller_id_number: sellerParam })
      );
      setSalesByCategory(await getSalesByCategory({ from, to, seller_id_number: sellerParam }));
      setTopSellers(await getTopSellers({ from, to, limit: 10, seller_id_number: sellerParam }));
      const f = await getAuctionFunnel({ from, to, seller_id_number: sellerParam });
      if (f) setFunnel(f);
    })();
  }, [from, to, group, sellerId]);

  // ----- נתונים לחלקים כלליים -----
  const pieData = [
    { name: "הגיעו לרוכש", value: stats.deliveredSales },
    { name: "טרם הגיעו", value: stats.undeliveredSales },
  ];
const productBarData = [
  { name: "נמכרו", value: stats.soldProducts },        // 👈 חדש
  { name: "טרם התחילו", value: stats.upcomingProducts },
  { name: "לא נמכרו", value: stats.unsoldProducts },
];

  const COLORS = ["#1a89ff", "#14b8a6", "#ff6b6b", "#ffa502"];

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>סטטיסטיקות מערכת</h2>


      {/* ===== קבוצה 1: גרפים כלליים (לא תלויי from/to/group) ===== */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>סקירה כללית</h3>
          <p className={styles.sectionSub}>נתונים מצטברים שלא תלויים בסינון התחתון</p>
        </div>

        <div className={styles.grid}>
          {/* פילוח משתמשים */}
          <div className={styles.card}>
            <h4 className={styles.cardTitle}>פילוח משתמשים</h4>
            <div className={styles.chart}>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={[
                    { name: "כל המשתמשים", value: stats.totalUsers },
                    { name: "מוכרים", value: stats.totalSellers },
                    { name: "חסומים", value: stats.blockedUsers },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis {...yAxisLeft} />
                  <Tooltip />
<Bar dataKey="value" fill="#1a89ff" radius={[8,8,0,0]}
     onClick={(d) => openDetails("usersBreakdown", d)} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* סטטוס משלוחים */}
          <div className={styles.card}>
            <h4 className={styles.cardTitle}>סטטוס משלוחים</h4>
            <div className={styles.chart}>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                 <Pie
  data={pieData}
  dataKey="value"
  nameKey="name"
  cx="50%"
  cy="50%"
  outerRadius={80}
  label
  onClick={(d) => openDetails("shipStatus", d)}
>
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

         
         {/* מוצרים לפי סטטוס */}
<div className={styles.card}>
  <h4 className={styles.cardTitle}>מוצרים לפי סטטוס</h4>
  <div className={styles.chart}>
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={productBarData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis {...yAxisLeft} />
        <Tooltip />
<Bar dataKey="value" fill="#ffa502" radius={[8,8,0,0]}
     onClick={(d) => openDetails("productsStatus", d)} />      </BarChart>
    </ResponsiveContainer>
  </div>
</div>

        </div>
      </div>

      {/* ===== קבוצה 2: אנליטיקות לפי טווח וקיבוץ ===== */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>אנליטיקות לפי טווח וקיבוץ</h3>

          {/* מסננים: טווח, קיבוץ, מוכר */}
          <div className={styles.filtersRow}>
            <div className={styles.filterGroup}>
              <label>מ־</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className={styles.filterGroup}>
              <label>עד</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className={styles.filterGroup}>
              <label>קיבוץ</label>
              <select value={group} onChange={(e) => setGroup(e.target.value)}>
                <option value="day">יום</option>
                <option value="month">חודש</option>
              </select>
            </div>
            <div className={styles.filterGroup}>
              <label>מוכר</label>
              <select value={sellerId} onChange={(e) => setSellerId(e.target.value)}>
                <option value="">כל המוכרים</option>
                {sellers.map((s) => (
                  <option key={s.id_number} value={s.id_number}>
                    {s.id_number} — {`${s.first_name || ""} ${s.last_name || ""}`.trim()}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className={styles.grid}>
          {/* 👇 חדש: הרשמות בטווח */}
          <div className={styles.card}>
            <h4 className={styles.cardTitle}>הרשמות בטווח- כללי</h4>
            <div className={styles.chart}>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={registrations}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="bucket"
                    tickFormatter={(v) => fmtBucket(v, group)}
                    minTickGap={10}
                    tickMargin={10}
                  />
                  <YAxis {...yAxisLeft} />
                  <Tooltip
                    labelFormatter={(v) => fmtBucket(v, group)}
                    formatter={(v) => Number(v).toLocaleString("he-IL")}
                  />
<Bar dataKey="count" fill="#8b5cf6" radius={[8,8,0,0]}
     onClick={(d) => openDetails("registrations", d)} />
                     </BarChart>
              </ResponsiveContainer>
            </div>
          </div>


     {/* סך מכירות לפי חודש (מטווח) */}
          <div className={styles.card}>
            <h4 className={styles.cardTitle}>סך מכירות לפי חודש- כללי</h4>
            <div className={styles.chart}>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={salesByMonthData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey={monthYearLabel}
                    interval={0}
                    angle={0}
                    textAnchor="middle"
                    minTickGap={10}
                    tickMargin={10}
                  />
                  <YAxis {...yAxisLeft} />
                  <Tooltip
                    labelFormatter={(label) => label}
                    formatter={(v) => fmtCurrency(v)}
                  />
<Bar dataKey="total_sales" fill="#3aaed8" radius={[8,8,0,0]}
     onClick={(d) => openDetails("salesByMonth", d)} />                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>


          {/* הכנסות בטווח */}
          <div className={styles.card}>
            <h4 className={styles.cardTitle}>הכנסות בטווח</h4>
            <div className={styles.chart}>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={revenue} margin={{ right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="bucket"
                    tickFormatter={(v) => fmtBucket(v, group)}
                    minTickGap={10}
                    tickMargin={10}
                  />
                  <YAxis {...yAxisLeft} />
                  <Tooltip
                    labelFormatter={(v) => fmtBucket(v, group)}
                    formatter={(v) => fmtCurrency(v)}
                  />
<Bar dataKey="total_sales" fill="#28a745" radius={[8,8,0,0]}
     onClick={(d) => openDetails("revenue", d)} />                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

     

          {/* פעילות הצעות */}
          <div className={styles.card}>
            <h4 className={styles.cardTitle}>פעילות הצעות</h4>
            <div className={styles.chart}>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={bidsActivity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="bucket"
                    tickFormatter={(v) => fmtBucket(v, group)}
                    minTickGap={10}
                    tickMargin={10}
                  />
                  <YAxis {...yAxisLeft} />
                  <Tooltip
                    labelFormatter={(v) => fmtBucket(v, group)}
                    formatter={(v) => Number(v).toLocaleString("he-IL")}
                  />
<Bar dataKey="total_bids" fill="#1a89ff" radius={[8,8,0,0]}
     onClick={(d) => openDetails("bidsActivity", d)} />                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* מכירות לפי קטגוריה */}
          <div className={styles.card}>
            <h4 className={styles.cardTitle}>מכירות לפי קטגוריה</h4>
            <div className={styles.chart}>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={salesByCategory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis {...yAxisLeft} />
                  <Tooltip formatter={(v) => fmtCurrency(v)} />
<Bar dataKey="total_sales" fill="#ff6b6b" radius={[8,8,0,0]}
     onClick={(d) => openDetails("salesByCategory", d)} />

                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* מוכרים מובילים */}
          <div className={styles.card}>
            <h4 className={styles.cardTitle}>מוכרים מובילים</h4>
            <div className={styles.chart}>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={topSellers}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="seller_name" interval={0} angle={-10} textAnchor="middle" />
                  <YAxis {...yAxisLeft} />
                  <Tooltip formatter={(v) => fmtCurrency(v)} />
<Bar dataKey="total_sales" fill="#14b8a6" radius={[8,8,0,0]}
     onClick={(d) => openDetails("topSellers", d)} />
jsx
Copy
Edit
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* משפך מכירות */}
          <div className={styles.card}>
            <h4 className={styles.cardTitle}>נתוני מכירות</h4>
            <div className={styles.chart}>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={[
                    { name: "התחילו", value: funnel.started },
                    { name: "נמכרו", value: funnel.sold },
                    { name: "לא נמכרו", value: funnel.not_sold },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis {...yAxisLeft} />
                  <Tooltip formatter={(v) => Number(v).toLocaleString("he-IL")} />
<Bar dataKey="value" fill="#ffa502" radius={[8,8,0,0]}
     onClick={(d) => openDetails("funnel", d)} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className={styles.conv}>שיעור המרה: <b>{funnel.conversion}%</b></div>
          </div>
        </div>
      </div>
      {modalOpen && (
  <CustomModal
    title={modalTitle}
    message={modalMessage}
    confirmText="סגור"
    onConfirm={closeModal}
    onClose={closeModal}
    // דוגמה: אפשר לחסום סגירה ע״י רקע/ESC במקרה שתרצי
    // disableBackdropClose
  />
)}

    </div>
  );
}

export default AdminStatistics;
