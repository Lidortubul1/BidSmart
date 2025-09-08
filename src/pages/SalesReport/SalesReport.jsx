import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import styles from "./SalesReport.module.css"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import {
  getRevenue,
  getSalesByCategory,
  getAuctionFunnel,
  getProductsStatusTrend
} from "../../services/adminApi";
import CustomModal from "../../components/CustomModal/CustomModal";

function RevenueFunnelCard({
  title = "הכנסות / משפך",
  revenueData = [],
  funnel = { started: 0, sold: 0, not_sold: 0, conversion: 0 },
  revenueGroup = "month",
  setRevenueGroup = () => {},
  fmtDay,
  fmtMonth,
  fmtInt,
  fmtCurrency,
  yAxisLeft,
  onOpenDetails,
}) {
  const [mode, setMode] = useState("revenue");

  return (
    <div className={styles.sellerStatsCard}>
      <div className={styles.sellerStatsCardHeaderRow}>
        <h4 className={styles.sellerStatsCardTitle}>{title}</h4>

        <div className={styles.sellerStatsInlineFilters}>
          <label>תצוגה</label>
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="revenue">הכנסות</option>
            <option value="funnel">משפך</option>
          </select>

          {mode === "revenue" && (
            <>
              <label>קיבוץ</label>
              <select value={revenueGroup} onChange={(e) => setRevenueGroup(e.target.value)}>
                <option value="day">יום</option>
                <option value="month">חודש</option>
              </select>
            </>
          )}
        </div>
      </div>

      <div className={styles.sellerStatsChart}>
        <ResponsiveContainer width="100%" height="100%">
          {mode === "revenue" ? (
            <BarChart data={revenueData} margin={{ right: 8 }}>
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
              <Bar
                dataKey="total_sales"
                fill="#28a745"
                radius={[8, 8, 0, 0]}
                onClick={(d) => onOpenDetails?.("revenue", d)}
              />
            </BarChart>
          ) : (
            <BarChart
              data={[
                { name: "התחילו", value: funnel?.started || 0 },
                { name: "נמכרו", value: funnel?.sold || 0 },
                { name: "לא נמכרו", value: funnel?.not_sold || 0 },
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis {...yAxisLeft} />
              <Tooltip formatter={(v) => fmtInt(v)} />
              <Bar dataKey="value" fill="#f59e0b" radius={[8, 8, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {mode === "funnel" && (
        <div className={styles.sellerStatsConv}>
          שיעור המרה: <b>{funnel?.conversion ?? 0}%</b>
        </div>
      )}
    </div>
  );
}

export default function SalesReport() {
  const { user } = useAuth();

  // ----- מסננים (hooks תמיד למעלה) -----
  const [from, setFrom] = useState(() =>
    new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10)
  );
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [group, setGroup] = useState("month");
  const [revenueGroup, setRevenueGroup] = useState("month");

  const ALL_TIME_FROM = "2000-01-01";
  const todayStr = new Date().toISOString().slice(0, 10);

  // ----- סטייטים -----
  const [revenue, setRevenue] = useState([]);
  const [funnel, setFunnel] = useState({ started: 0, sold: 0, not_sold: 0, conversion: 0 });
  const [productsStatusTrend, setProductsStatusTrend] = useState([]);
  const [salesByCategory, setSalesByCategory] = useState([]);
  const [categoryMetric, setCategoryMetric] = useState("sold_count");

  // ----- מודאל -----
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState(null);
  const openModal = (title, message) => { setModalTitle(title); setModalMessage(message); setModalOpen(true); };
  const closeModal = () => setModalOpen(false);

  // ----- פורמט -----
  const fmtInt = (v) => Number(v ?? 0).toLocaleString("he-IL");
  const fmtCurrency = (v) => `${Number(v ?? 0).toLocaleString("he-IL")} ₪`;
  const fmtDay = (iso) =>
    new Intl.DateTimeFormat("he-IL", { day: "2-digit", month: "short" }).format(new Date(iso));
  const fmtMonth = (ym) =>
    new Intl.DateTimeFormat("he-IL", { month: "short", year: "2-digit" })
      .format(new Date((ym?.length === 7 ? ym + "-01" : ym) || ""));
  const fmtBucket = (bucket, g) => (g === "day" ? fmtDay(bucket) : fmtMonth(bucket));

  const yAxisLeft = { orientation: "left", width: 56, tickMargin: 20, tick: { dx: -10 }, allowDecimals: false };

  const sellerIdNumber = user?.id_number ?? null;

  // ----- טעינת נתונים -----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!sellerIdNumber) {
        if (!cancelled) {
          setRevenue([]); setSalesByCategory([]); setProductsStatusTrend([]);
          setFunnel({ started: 0, sold: 0, not_sold: 0, conversion: 0 });
        }
        return;
      }

      const sellerParam = { seller_id_number: sellerIdNumber };
      const [rev, fun, stat, byCat] = await Promise.all([
        getRevenue({ from, to, group: revenueGroup, ...sellerParam }),
        getAuctionFunnel({ from, to, ...sellerParam }),
        getProductsStatusTrend({ from, to, group, ...sellerParam }),
        getSalesByCategory({ from, to, ...sellerParam }),
      ]);

      if (!cancelled) {
        setRevenue(rev || []);
        setFunnel(fun || { started: 0, sold: 0, not_sold: 0, conversion: 0 });
        setProductsStatusTrend(stat || []);
        setSalesByCategory(byCat || []);
      }
    })();
    return () => { cancelled = true; };
  }, [sellerIdNumber, from, to, group, revenueGroup]);

  // ----- מודאל פרטים -----
  const openDetails = (kind, raw) => {
    const p = raw?.payload ?? raw;
    try {
      switch (kind) {
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
        case "salesByCategory":
          openModal("מוצרים לפי קטגוריה — בטווח (אתה)", (
            <div>
              <p><b>קטגוריה:</b> {p?.category}</p>
              {"sold_count" in p && <p><b>כמות מוצרים שנמכרו:</b> {fmtInt(p.sold_count)}</p>}
              {"total_sales" in p && <p><b>סה״כ מכירות:</b> {fmtCurrency(p.total_sales)}</p>}
            </div>
          ));
          break;
        default:
          openModal("פרטים", JSON.stringify(p ?? {}, null, 2));
      }
    } catch {
      openModal("פרטים", JSON.stringify(raw ?? {}, 2));
    }
  };

  const handleAllTime = () => { setFrom(ALL_TIME_FROM); setTo(todayStr); setGroup("month"); };
  const isAllTime = from === ALL_TIME_FROM && to === todayStr && group === "month";

  const kpis = useMemo(() => ([
    { label: "פריטים התחילו", value: fmtInt(funnel?.started || 0) },
    { label: "נמכרו", value: fmtInt(funnel?.sold || 0) },
    { label: "לא נמכרו", value: fmtInt(funnel?.not_sold || 0) },
    { label: "שיעור המרה", value: `${funnel?.conversion ?? 0}%` },
  ]), [funnel]);

  return (
    <>
      {!user ? <Navigate to="/login" replace /> : null}
      {user && user.role !== "seller" ? <Navigate to="/" replace /> : null}

      <div className={styles.sellerStatsContainer}>
        <h2 className={styles.sellerStatsTitle}>
          סטטיסטיקות מכירה — {user?.first_name} {user?.last_name}
        </h2>

        {/* מסננים */}
        <div className={styles.sellerStatsSection}>
          <div className={styles.sellerStatsSectionHeader}>
            <h3 className={styles.sellerStatsSectionTitle}>מסננים</h3>
            <div className={styles.sellerStatsFiltersRow}>
              <div className={styles.sellerStatsFilterGroup}>
                <label>מ־</label>
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div className={styles.sellerStatsFilterGroup}>
                <label>עד</label>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
              <div className={styles.sellerStatsFilterGroup}>
                <label>קיבוץ (סטטוס מוצרים)</label>
                <select value={group} onChange={(e) => setGroup(e.target.value)}>
                  <option value="day">יום</option>
                  <option value="month">חודש</option>
                </select>
              </div>
              <div className={styles.sellerStatsFilterGroup}>
                <label>קיבוץ הכנסות</label>
                <select value={revenueGroup} onChange={(e) => setRevenueGroup(e.target.value)}>
                  <option value="day">יום</option>
                  <option value="month">חודש</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleAllTime}
                className={styles.sellerStatsAllTimeBtn}
                disabled={isAllTime}
                title="הצגת נתונים לכל התקופות (קיבוץ חודשי)"
              >
                כל הזמנים
              </button>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className={styles.sellerStatsSection}>
          <div className={styles.sellerStatsKpiGrid}>
            {kpis.map((k) => (
              <div key={k.label} className={styles.sellerStatsKpiCard}>
                <div className={styles.sellerStatsKpiLabel}>{k.label}</div>
                <div className={styles.sellerStatsKpiValue}>{k.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* גרפים */}
        <div className={styles.sellerStatsSection}>
          <div className={styles.sellerStatsSectionHeader}>
            <h3 className={styles.sellerStatsSectionTitle}>גרפים לפי טווח תאריכים — המוצרים שלי</h3>
          </div>

          <div className={styles.sellerStatsGrid}>
            <RevenueFunnelCard
              title="הכנסות / משפך — אני"
              revenueData={revenue}
              funnel={funnel}
              revenueGroup={revenueGroup}
              setRevenueGroup={setRevenueGroup}
              fmtDay={fmtDay} fmtMonth={fmtMonth} fmtInt={fmtInt} fmtCurrency={fmtCurrency}
              yAxisLeft={yAxisLeft}
              onOpenDetails={openDetails}
            />

            <div className={styles.sellerStatsCard}>
              <h4 className={styles.sellerStatsCardTitle}>מוצרים לפי סטטוס — אני</h4>
              <div className={styles.sellerStatsChart}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={productsStatusTrend} barCategoryGap="20%" barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="bucket" tickFormatter={(v) => fmtBucket(v, group)} minTickGap={10} tickMargin={10} />
                    <YAxis {...yAxisLeft} />
                    <Tooltip
                      labelFormatter={(v) => fmtBucket(v, group)}
                      formatter={(val, key) => {
                        const map = { for_sale: "טרם התחיל", sale: "נמכר", not_sold: "לא נמכר", blocked: "נמחק" };
                        return [fmtInt(val), map[key] || key];
                      }}
                    />
                    <Bar dataKey="for_sale" name="טרם התחיל" fill="#3aaed8" radius={[8, 8, 0, 0]}
                      onClick={(d) => openDetails("productsStatusTrend", d)} />
                    <Bar dataKey="sale" name="נמכר" fill="#28a745" radius={[8, 8, 0, 0]}
                      onClick={(d) => openDetails("productsStatusTrend", d)} />
                    <Bar dataKey="not_sold" name="לא נמכר" fill="#ff6b6b" radius={[8, 8, 0, 0]}
                      onClick={(d) => openDetails("productsStatusTrend", d)} />
                    <Bar dataKey="blocked" name="נמחק" fill="#ffa502" radius={[8, 8, 0, 0]}
                      onClick={(d) => openDetails("productsStatusTrend", d)} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className={styles.sellerStatsCard}>
              <div className={styles.sellerStatsCardHeaderRow}>
                <h4 className={styles.sellerStatsCardTitle}>מוצרים לפי קטגוריה — אני</h4>
                <div className={styles.sellerStatsFilterGroup}>
                  <label>מדד</label>
                  <select value={categoryMetric} onChange={(e) => setCategoryMetric(e.target.value)}>
                    <option value="sold_count">כמות מוצרים</option>
                    <option value="total_sales">סה״כ מכירות (₪)</option>
                  </select>
                </div>
              </div>
              <div className={styles.sellerStatsChart}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesByCategory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" interval={0} tickMargin={10} />
                    <YAxis {...yAxisLeft} />
                    <Tooltip formatter={(v) => categoryMetric === "total_sales" ? fmtCurrency(v) : fmtInt(v)} />
                    <Bar dataKey={categoryMetric} fill="#0ea5e9" radius={[8, 8, 0, 0]}
                      onClick={(d) => openDetails("salesByCategory", d)} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
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
    </>
  );
}
