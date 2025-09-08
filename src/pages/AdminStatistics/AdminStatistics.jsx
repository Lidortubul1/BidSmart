// סטטיסטיקות מנהל (שמות קלאסים ייחודיים)
import { useEffect, useState, useMemo } from "react";
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
  const [mode, setMode] = useState("revenue"); // 'revenue' | 'funnel'

  return (
    <div className={styles.adminStatsCard}>
      <div
        className={styles.adminStatsCardHeaderRow}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
      >
        <h4 className={styles.adminStatsCardTitle} style={{ margin: 0 }}>{title}</h4>

        <div className={styles.adminStatsInlineFilters}>
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

      <div className={styles.adminStatsChart}>
        <ResponsiveContainer width="100%" height={250}>
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
        <div className={styles.adminStatsConv}>
          שיעור המרה: <b>{funnel?.conversion ?? 0}%</b>
        </div>
      )}
    </div>
  );
}

function AdminStatistics() {
  // ----- מסננים -----
  const [from, setFrom] = useState(() =>
    new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10)
  );
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [group, setGroup] = useState("month");
  const [revenueGroup, setRevenueGroup] = useState("month");
  const [sellerId, setSellerId] = useState("");
  const [sellers, setSellers] = useState([]);

  const ALL_TIME_FROM = "2000-01-01";
  const todayStr = new Date().toISOString().slice(0, 10);

  // ----- סטייטים כלליים -----
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
  const [revenueAll, setRevenueAll] = useState([]);
  const [salesByCategoryAll, setSalesByCategoryAll] = useState([]);
  const [topSellersAll, setTopSellersAll] = useState([]);
  const [funnelAll, setFunnelAll] = useState({ started: 0, sold: 0, not_sold: 0, conversion: 0 });
  const [productsStatusTrendAll, setProductsStatusTrendAll] = useState([]);

  // ----- סטייטים לפילוח “לפי מוכר” -----
  const [revenueSeller, setRevenueSeller] = useState([]);
  const [salesByCategorySeller, setSalesByCategorySeller] = useState([]);
  const [productsStatusTrendSeller, setProductsStatusTrendSeller] = useState([]);
  const [funnelSeller, setFunnelSeller] = useState({ started: 0, sold: 0, not_sold: 0, conversion: 0 });

  const [categoryMetric, setCategoryMetric] = useState("sold_count");

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

  // ----- טעינת רשימת מוכרים -----
  useEffect(() => {
    (async () => {
      const list = await getSellersList();
      setSellers(list || []);
    })();
  }, []);

  const currentSellerName = useMemo(() => {
    const s = sellers.find(x => String(x.id_number) === String(sellerId));
    return s ? `${(s.first_name || "").trim()} ${(s.last_name || "").trim()}`.trim() : "";
  }, [sellers, sellerId]);

  // ----- גרפים כלליים -----
  useEffect(() => {
    (async () => {
      const s = await getAdminStats({ from, to });
      if (s) setStats(s);

      setRegistrations(await getRegistrationsRange({ from, to, group }));
      setRevenueAll(await getRevenue({ from, to, group: revenueGroup }));
      setProductsStatusTrendAll(await getProductsStatusTrend({ from, to, group }));
      setSalesByCategoryAll(await getSalesByCategory({ from, to }));
      setTopSellersAll(await getTopSellers({ from, to, limit: 10 }));

      const f = await getAuctionFunnel({ from, to });
      if (f) setFunnelAll(f);
    })();
  }, [from, to, group, revenueGroup]);

  // ----- גרפים לפי מוכר -----
  useEffect(() => {
    (async () => {
      if (!sellerId) {
        setRevenueSeller([]);
        setSalesByCategorySeller([]);
        setProductsStatusTrendSeller([]);
        setFunnelSeller({ started: 0, sold: 0, not_sold: 0, conversion: 0 });
        return;
      }

      setRevenueSeller(await getRevenue({ from, to, group: revenueGroup, seller_id_number: sellerId }));
      setProductsStatusTrendSeller(await getProductsStatusTrend({ from, to, group, seller_id_number: sellerId }));
      setSalesByCategorySeller(await getSalesByCategory({ from, to, seller_id_number: sellerId }));

      const f = await getAuctionFunnel({ from, to, seller_id_number: sellerId });
      if (f) setFunnelSeller(f);
    })();
  }, [sellerId, from, to, group, revenueGroup]);

  // ----- מודאל פרטים -----
  const openDetails = (kind, raw) => {
    const p = raw?.payload ?? raw;
    try {
      switch (kind) {
        case "salesByCategory":
          openModal("מוצרים לפי קטגוריה — בטווח", (
            <div>
              <p><b>קטגוריה:</b> {p?.category}</p>
              {"sold_count" in p && <p><b>כמות מוצרים שנמכרו:</b> {fmtInt(p.sold_count)}</p>}
              {"total_sales" in p && <p><b>סה״כ מכירות:</b> {fmtCurrency(p.total_sales)}</p>}
            </div>
          ));
          break;

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

  const handleAllTime = () => { setFrom(ALL_TIME_FROM); setTo(todayStr); setGroup("month"); };
  const isAllTime = from === ALL_TIME_FROM && to === todayStr && group === "month";

  return (
    <div className={styles.adminStatsContainer}>
      <h2 className={styles.adminStatsTitle}>סטטיסטיקות מערכת</h2>

      {/* מסננים כלליים */}
      <div className={styles.adminStatsSection}>
        <div className={styles.adminStatsSectionHeader}>
          <h3 className={styles.adminStatsSectionTitle}>מסננים</h3>
          <div className={styles.adminStatsFiltersRow}>
            <div className={styles.adminStatsFilterGroup}>
              <label>מ־</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className={styles.adminStatsFilterGroup}>
              <label>עד</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className={styles.adminStatsFilterGroup}>
              <label>קיבוץ (רוב הגרפים)</label>
              <select value={group} onChange={(e) => setGroup(e.target.value)}>
                <option value="day">יום</option>
                <option value="month">חודש</option>
              </select>
            </div>
            <div className={styles.adminStatsFilterGroup}>
              <label>קיבוץ הכנסות</label>
              <select value={revenueGroup} onChange={(e) => setRevenueGroup(e.target.value)}>
                <option value="day">יום</option>
                <option value="month">חודש</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleAllTime}
              className={styles.adminStatsAllTimeBtn}
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
      </div>

      {/* גרפים כללים */}
      <div className={styles.adminStatsSection}>
        <div className={styles.adminStatsSectionHeader}>
          <h3 className={styles.adminStatsSectionTitle}>גרפים לפי טווח תאריכים — כללי</h3>
        </div>

        <div className={styles.adminStatsGrid}>
          {/* פילוח משתמשים */}
          <div className={styles.adminStatsCard}>
            <h4 className={styles.adminStatsCardTitle}>פילוח משתמשים — בטווח</h4>
            <div className={styles.adminStatsChart}>
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
                  <Bar dataKey="value" fill="#1a89ff" radius={[8, 8, 0, 0]}
                    onClick={(d) => openDetails("usersBreakdown", d)} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* הרשמות */}
          <div className={styles.adminStatsCard}>
            <h4 className={styles.adminStatsCardTitle}>הרשמות בטווח — כללי</h4>
            <div className={styles.adminStatsChart}>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={registrations}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="bucket" tickFormatter={(v) => fmtBucket(v, group)} minTickGap={10} tickMargin={10} />
                  <YAxis {...yAxisLeft} />
                  <Tooltip labelFormatter={(v) => fmtBucket(v, group)} formatter={(v) => fmtInt(v)} />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[8, 8, 0, 0]}
                    onClick={(d) => openDetails("registrations", d)} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <RevenueFunnelCard
            title="הכנסות / משפך — כללי"
            revenueData={revenueAll}
            funnel={funnelAll}
            revenueGroup={revenueGroup}
            setRevenueGroup={setRevenueGroup}
            fmtDay={fmtDay}
            fmtMonth={fmtMonth}
            fmtInt={fmtInt}
            fmtCurrency={fmtCurrency}
            yAxisLeft={yAxisLeft}
            onOpenDetails={openDetails}
          />

          {/* סטטוסים */}
          <div className={styles.adminStatsCard}>
            <h4 className={styles.adminStatsCardTitle}>מוצרים לפי סטטוס — כללי</h4>
            <div className={styles.adminStatsChart}>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={productsStatusTrendAll} barCategoryGap="20%" barGap={4}>
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

          {/* קטגוריות */}
          <div className={styles.adminStatsCard}>
            <div
              className={styles.adminStatsCardHeaderRow}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
            >
              <h4 className={styles.adminStatsCardTitle} style={{ margin: 0 }}>מוצרים לפי קטגוריה — כללי</h4>
              <div className={styles.adminStatsFilterGroup} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <label>מדד</label>
                <select value={categoryMetric} onChange={(e) => setCategoryMetric(e.target.value)}>
                  <option value="sold_count">כמות מוצרים</option>
                  <option value="total_sales">סה״כ מכירות (₪)</option>
                </select>
              </div>
            </div>
            <div className={styles.adminStatsChart}>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={salesByCategoryAll}>
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

          {/* מוכרים מובילים */}
          <div className={styles.adminStatsCard}>
            <h4 className={styles.adminStatsCardTitle}>מוכרים מובילים — כללי</h4>
            <div className={styles.adminStatsChart}>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={topSellersAll}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="seller_name" interval={0} angle={-10} textAnchor="middle" />
                  <YAxis {...yAxisLeft} />
                  <Tooltip formatter={(v) => fmtCurrency(v)} />
                  <Bar dataKey="total_sales" fill="#14b8a6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* פילוח לפי מוכר */}
      <div className={styles.adminStatsSection}>
        <div className={styles.adminStatsSectionHeader}>
          <h3 className={styles.adminStatsSectionTitle}>פילוח לפי מוכר</h3>

          <div className={styles.adminStatsFiltersRow} style={{ marginTop: 8 }}>
            <div className={styles.adminStatsFilterGroup}>
              <label>בחר/י מוכר</label>
              <select value={sellerId} onChange={(e) => setSellerId(e.target.value)}>
                <option value="">— ללא —</option>
                {sellers.map((s) => (
                  <option key={s.id_number} value={s.id_number}>
                    {s.id_number} — {`${s.first_name || ""} ${s.last_name || ""}`.trim()}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {!sellerId ? (
          <div className={styles.adminStatsCard} style={{ padding: 24 }}>
            בחר/י מוכר כדי להציג גרפים ממוקדים למוכר.
          </div>
        ) : (
          <>
            <div className={styles.adminStatsSubTitle} style={{ margin: "8px 0 16px", color: "#6b7280" }}>
              מציג נתונים עבור: <b>{currentSellerName || sellerId}</b> (בטווח {from}–{to})
            </div>

            <div className={styles.adminStatsGrid}>
              <RevenueFunnelCard
                title="הכנסות / משפך — לפי מוכר"
                revenueData={revenueSeller}
                funnel={funnelSeller}
                revenueGroup={revenueGroup}
                setRevenueGroup={setRevenueGroup}
                fmtDay={fmtDay}
                fmtMonth={fmtMonth}
                fmtInt={fmtInt}
                fmtCurrency={fmtCurrency}
                yAxisLeft={yAxisLeft}
                onOpenDetails={openDetails}
              />

              <div className={styles.adminStatsCard}>
                <h4 className={styles.adminStatsCardTitle}>מוצרים לפי סטטוס — לפי מוכר</h4>
                <div className={styles.adminStatsChart}>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={productsStatusTrendSeller} barCategoryGap="20%" barGap={4}>
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

              <div className={styles.adminStatsCard}>
                <div
                  className={styles.adminStatsCardHeaderRow}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
                >
                  <h4 className={styles.adminStatsCardTitle} style={{ margin: 0 }}>מוצרים לפי קטגוריה — לפי מוכר</h4>
                  <div className={styles.adminStatsFilterGroup} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <label>מדד</label>
                    <select value={categoryMetric} onChange={(e) => setCategoryMetric(e.target.value)}>
                      <option value="sold_count">כמות מוצרים</option>
                      <option value="total_sales">סה״כ מכירות (₪)</option>
                    </select>
                  </div>
                </div>
                <div className={styles.adminStatsChart}>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={salesByCategorySeller}>
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
          </>
        )}
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
