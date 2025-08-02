import { useEffect, useState } from "react";
import styles from "./AdminStatistics.module.css";
import { BarChart,Bar,XAxis,YAxis,CartesianGrid,Tooltip,ResponsiveContainer,PieChart,Pie,Cell,} from "recharts";
import {
  getAdminStats,
  getRegistrationsByMonth,
  getProductsByCategory,
  getSalesByMonth,
} from "../../services/adminApi";
// import { format } from "date-fns"; // אופציונלי לתצוגה יפה

function AdminStatistics() {
  const [stats, setStats] = useState({
    totalSellers: 0,
    totalUsers: 0,
    deliveredSales: 0,
    undeliveredSales: 0,
    upcomingProducts: 0,
    unsoldProducts: 0,
  });
const [categoryStats, setCategoryStats] = useState([]);
const [salesByMonth, setSalesByMonth] = useState([]);

useEffect(() => {
  getSalesByMonth().then(setSalesByMonth);
}, []);

useEffect(() => {
  getProductsByCategory().then(setCategoryStats);
}, []);


  useEffect(() => {
    async function fetchStats() {
      const data = await getAdminStats();
      if (data) setStats(data);
    }
    fetchStats();
  }, []);


const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // ינואר = 1
const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
const [monthlyRegistrations, setMonthlyRegistrations] = useState([]);
useEffect(() => {
  getRegistrationsByMonth(selectedYear, selectedMonth).then(
    setMonthlyRegistrations
  );
}, [selectedYear, selectedMonth]);


  const pieData = [
    { name: "הגיעו לרוכש", value: stats.deliveredSales },
    { name: "טרם הגיעו", value: stats.undeliveredSales },
  ];

  const productBarData = [
    { name: "טרם התחילו", value: stats.upcomingProducts },
    { name: "לא נמכרו", value: stats.unsoldProducts },
  ];





const hebrewMonths = [
  "ינואר",
  "פברואר",
  "מרץ",
  "אפריל",
  "מאי",
  "יוני",
  "יולי",
  "אוגוסט",
  "ספטמבר",
  "אוקטובר",
  "נובמבר",
  "דצמבר",
];


  const COLORS = ["#1a89ff", "#14b8a6", "#ff6b6b", "#ffa502"];











  return (
    <div className={styles.container}>
      <h2 className={styles.title}>סטטיסטיקות מערכת</h2>

      <div className={styles.grid}>
        <div className={styles.card}>
          <h3>פילוח משתמשים</h3>
          <BarChart
            width={350}
            height={250}
            data={[
              { name: "כל המשתמשים", value: stats.totalUsers },
              { name: "מוכרים", value: stats.totalSellers },
              { name: "חסומים", value: stats.blockedUsers },
            ]}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="value" fill="#1a89ff" />
          </BarChart>
        </div>

        <div className={styles.card}>
          <h3>הרשמות לפי תאריך</h3>
          <div>
            <label>חודש: </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
            >
              {[...Array(12).keys()].map((m) => (
                <option key={m + 1} value={m + 1}>
                  {hebrewMonths[m]}
                </option>
              ))}
            </select>

            <label>שנה: </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              {[2023, 2024, 2025].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <BarChart width={350} height={250} data={monthlyRegistrations}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#14b8a6" />
          </BarChart>
          <h4>
            מספר משתמשים שנרשמו ב־{hebrewMonths[selectedMonth - 1]}{" "}
            {selectedYear}
          </h4>
        </div>

        <div className={styles.card}>
          <h3>סטטוס משלוחים</h3>
          <PieChart width={300} height={250}>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label
            >
              {pieData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </div>

        <div className={styles.card}>
          <h3>מוצרים לפי סטטוס</h3>
          <BarChart width={350} height={250} data={productBarData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="value" fill="#ffa502" />
          </BarChart>
        </div>

        <div className={styles.card}>
          <h3>סך מכירות לפי חודש</h3>
          <BarChart width={400} height={250} data={salesByMonth}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey={(entry) => `${entry.month}/${entry.year}`}
              interval={0}
              angle={-0}
              textAnchor="middle"
            />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="total_sales" fill="#28a745" />
          </BarChart>
        </div>

        <div className={styles.card}>
          <h3>כמות מוצרים לפי קטגוריה</h3>
          <BarChart width={400} height={250} data={categoryStats}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="category" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#ff6b6b" />
          </BarChart>
        </div>
      </div>
    </div>
  );
}

export default AdminStatistics;
