// src/pages/AdminStatistics/AdminStatistics.jsx
import { useEffect, useState } from "react";
import styles from "./AdminStatistics.module.css";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

import {
  getAdminStats,
  getRevenue,
  getSalesByCategory,
  getTopSellers,
  getAuctionFunnel,
  getSellersList,
  getRegistrationsRange,
  getProductsStatusTrend,
} from "../../services/adminApi";
import CustomModal from "../../components/CustomModal/CustomModal";

function AdminStatistics() {
  // ----- מסננים -----
  const [from, setFrom] = useState(() =>
    new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10)
  );
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [group, setGroup] = useState("month"); // day | month
  const [revenueGroup, setRevenueGroup] = useState("month"); // day | month
  const [sellerId, setSellerId] = useState("");
  const [sellers, setSellers] = useState([]);

  const ALL_TIME_FROM = "2000-01-01";
  const todayStr = new Date().toISOString().slice(0, 10);

  // ----- סטייטים של גרפים -----
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

  const [registrations, setRegistrations] = useState([]);
  const [revenue, setRevenue] = useState([]);
  const [salesByCategory, setSalesByCategory] = useState([]);
  const [topSellers, setTopSellers] = useState([]);
  const [funnel, setFunnel] = useState({ started: 0, sold: 0, not_sold: 0, conversion: 0 });
  const [productsStatusTrend, setProductsStatusTrend] = useState([]);

  // ----- מודאל -----
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState(null);
  const openModal = (title, message) => { setModalTitle(title); setModalMessage(message); setModalOpen(true); };
  const closeModal = () => setModalOpen(false);

  // ----- עזרי פורמט -----
  const fmtInt = (v) => Number(v ?? 0).toLocaleString("he-IL");
  const fmtCurrency = (v) => `${Number(v ?? 0).toLocaleString("he-IL")} ₪`;
  const fmtDay = (iso) =>
    new Intl.DateTimeFormat("he-IL", { day: "2-digit", month: "short" }).format(new Date(iso));
  const fmtMonth = (ym) =>
    new Intl.DateTimeFormat("he-IL", { month: "short", year: "2-digit" })
      .format(new Date((ym?.length === 7 ? ym + "-01" : ym) || ""));
  const fmtBucket = (bucket, g) => (g === "day" ? fmtDay(bucket) : fmtMonth(bucket));

  const yAxisLeft = {
    orientation: "left",
    width: 56,
    tickMargin: 20,
    tick: { dx: -10 },
    allowDecimals: false,
  };

  // ----- טעינות -----
  // רשימת מוכרים
  useEffect(() => {
    (async () => {
      const list = await getSellersList();
      setSellers(list || []);
    })();
  }, []);

  // כל הגרפים שתלויים בטווח/קיבוץ/מוכר + פילוח משתמשים בטווח
  useEffect(() => {
    (async () => {
      const sellerParam = sellerId || undefined;

      // פילוח משתמשים — עכשיו לפי הטווח שנבחר
      const s = await getAdminStats({ from, to });
      if (s) setStats(s);

      // הרשמות בקיבוץ שנבחר (לא מסונן לפי מוכר)
      setRegistrations(await getRegistrationsRange({ from, to, group }));

      // הכנסות (קיבוץ נפרד)
      setRevenue(await getRevenue({ from, to, group: revenueGroup, seller_id_number: sellerParam }));

      // מוצרים לפי סטטוס בטווח
      setProductsStatusTrend(
        await getProductsStatusTrend({ from, to, group, seller_id_number: sellerParam })
      );

      // מכירות לפי קטגוריה / מוכרים מובילים / משפך
      setSalesByCategory(await getSalesByCategory({ from, to, seller_id_number: sellerParam }));
      setTopSellers(await getTopSellers({ from, to, limit: 10, seller_id_number: sellerParam }));
      const f = await getAuctionFunnel({ from, to, seller_id_number: sellerParam });
      if (f) setFunnel(f);
    })();
  }, [from, to, group, sellerId, revenueGroup]);

  // ----- מודאל פרטים -----
  const openDetails = (kind, raw) => {
    const p = raw?.payload ?? raw;
    try {
      switch (kind) {
        case "usersBreakdown":
          openModal("פילוח משתמשים (בטווח)", (
            <div>
              <p><b>כ״ז:</b> {from}–{to}</p>
              <p><b>כל המשתמשים:</b> {fmtInt(stats.totalUsers)}</p>
              <p><b>מוכרים:</b> {fmtInt(stats.totalSellers)}</p>
              <p><b>חסומים:</b> {fmtInt(stats.blockedUsers)}</p>
            </div>
          ));
          break;

        case "productsStatusTrend":
          openModal("מוצרים לפי סטטוס (בטווח)", (
            <div>
              <p><b>תקופה:</b> {fmtBucket(p?.bucket, group)}</p>
              <p><b>טרם התחיל:</b> {fmtInt(p?.for_sale)}</p>
              <p><b>נמכר:</b> {fmtInt(p?.sale)}</p>
              <p><b>לא נמכר:</b> {fmtInt(p?.not_sold)}</p>
              <p><b>נמחק:</b> {fmtInt(p?.blocked)}</p>
            </div>
          ));
          break;

        case "registrations":
          openModal("הרשמות בטווח", (
            <div>
              <p><b>תקופה:</b> {fmtBucket(p?.bucket, group)}</p>
              <p><b>מס׳ הרשמות:</b> {fmtInt(p?.count)}</p>
            </div>
          ));
          break;

        case "revenue":
          openModal("הכנסות בטווח", (
            <div>
              <p><b>תקופה:</b> {revenueGroup === "day" ? fmtDay(p?.bucket) : fmtMonth(p?.bucket)}</p>
              <p><b>סה״כ מכירות:</b> {fmtCurrency(p?.total_sales)}</p>
              {"orders_count" in p && <p><b>מס׳ עסקאות:</b> {fmtInt(p.orders_count)}</p>}
              {"avg_order_value" in p && <p><b>ערך הזמנה ממוצע:</b> {fmtCurrency(p.avg_order_value)}</p>}
            </div>
          ));
          break;

        default:
          openModal("פרטים", JSON.stringify(p ?? {}, null, 2));
      }
    } catch {
      openModal("פרטים", JSON.stringify(raw ?? {}, null, 2));
    }
  };

  // כפתור "כל הזמנים"
  const handleAllTime = () => {
    setFrom(ALL_TIME_FROM);
    setTo(todayStr);
    setGroup("month");
  };
  const isAllTime = from === ALL_TIME_FROM && to === todayStr && group === "month";

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>סטטיסטיקות מערכת</h2>

     

      {/* ===== קבוצה 2: אנליטיקות לפי טווח וקיבוץ ===== */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>אנליטיקות לפי טווח וקיבוץ</h3>

        {/* מסננים */}
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

            <button
              type="button"
              onClick={handleAllTime}
              className={styles.allTimeBtn}
              title="הצגת נתונים לכל התקופות (קיבוץ חודשי)"
              disabled={isAllTime}
              style={{
                marginInlineStart: 8,
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                background: isAllTime ? "#f3f4f6" : "#fff",
                cursor: isAllTime ? "default" : "pointer",
              }}
            >
              כל הזמנים
            </button>
          </div>
        </div>



        <div className={styles.grid}>

               {/* פילוח משתמשים — לפי טווח */}
          <div className={styles.card}>
            <h4 className={styles.cardTitle}>פילוח משתמשים — בטווח</h4>
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
                  <Tooltip formatter={(v) => fmtInt(v)} />
                  <Bar
                    dataKey="value"
                    fill="#1a89ff"
                    radius={[8, 8, 0, 0]}
                    onClick={(d) => openDetails("usersBreakdown", d)}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* הרשמות בטווח */}
          <div className={styles.card}>
            <h4 className={styles.cardTitle}>הרשמות בטווח — כללי</h4>
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
                  <Bar dataKey="count" fill="#8b5cf6" radius={[8, 8, 0, 0]}
                       onClick={(d) => openDetails("registrations", d)} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* הכנסות בטווח */}
          <div className={styles.card}>
            <div className={styles.cardHeaderRow}
                 style={{display:"flex", alignItems:"center", justifyContent:"space-between"}}>
              <h4 className={styles.cardTitle} style={{margin:0}}>הכנסות בטווח</h4>
              <div className={styles.filterGroup} style={{display:"flex", gap:8, alignItems:"center"}}>
                <label>קיבוץ הכנסות</label>
                <select value={revenueGroup} onChange={(e) => setRevenueGroup(e.target.value)}>
                  <option value="day">יום</option>
                  <option value="month">חודש</option>
                </select>
              </div>
            </div>

            <div className={styles.chart}>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={revenue} margin={{ right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="bucket"
                    tickFormatter={(v) => (revenueGroup === "day" ? fmtDay(v) : fmtMonth(v))}
                    minTickGap={10}
                    tickMargin={10}
                  />
                  <YAxis {...yAxisLeft} />
                  <Tooltip
                    labelFormatter={(v) => (revenueGroup === "day" ? fmtDay(v) : fmtMonth(v))}
                    formatter={(v) => fmtCurrency(v)}
                  />
                  <Bar dataKey="total_sales" fill="#28a745" radius={[8, 8, 0, 0]}
                       onClick={(d) => openDetails("revenue", d)} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* מוצרים לפי סטטוס — בטווח */}
          <div className={styles.card}>
            <h4 className={styles.cardTitle}>מוצרים לפי סטטוס — בטווח</h4>
            <div className={styles.chart}>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={productsStatusTrend} barCategoryGap="20%" barGap={4}>
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
                    formatter={(val, key) => {
                      const labelMap = {
                        for_sale: "טרם התחיל",
                        sale: "נמכר",
                        not_sold: "לא נמכר",
                        blocked: "נמחק",
                      };
                      return [fmtInt(val), labelMap[key] || key];
                    }}
                  />
                  <Bar dataKey="for_sale" name="טרם התחיל" fill="#3aaed8" radius={[8,8,0,0]}
                       onClick={(d) => openDetails("productsStatusTrend", d)} />
                  <Bar dataKey="sale" name="נמכר" fill="#28a745" radius={[8,8,0,0]}
                       onClick={(d) => openDetails("productsStatusTrend", d)} />
                  <Bar dataKey="not_sold" name="לא נמכר" fill="#ff6b6b" radius={[8,8,0,0]}
                       onClick={(d) => openDetails("productsStatusTrend", d)} />
                  <Bar dataKey="blocked" name="נמחק" fill="#ffa502" radius={[8,8,0,0]}
                       onClick={(d) => openDetails("productsStatusTrend", d)} />
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
                  <Bar dataKey="total_sales" fill="#14b8a6" radius={[8, 8, 0, 0]} />
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
                  <Bar dataKey="value" fill="#ffa502" radius={[8, 8, 0, 0]} />
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
        />
      )}
    </div>
  );
}

export default AdminStatistics;
