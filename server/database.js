// server/routes/database.js
const mysql = require("mysql2/promise");

let conn = null;

// תור סדרתי כדי שלא ירוצו שאילתות במקביל על חיבור יחיד
let chain = Promise.resolve();
function serialize(run) {
  const p = chain.then(run, run);
  chain = p.catch(() => {}); // לא לחסום את התור אם הייתה שגיאה
  return p;
}

async function connect() {
  if (conn) return conn;

  conn = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASS || undefined,
    database: process.env.DB_NAME || "bidsmart",
    dateStrings: true,
    timezone: "Z",
  });

  // עיטוף מתודות ל־serialize (שומר על אותו API)
  const _execute = conn.execute.bind(conn);
  const _query   = conn.query.bind(conn);
  const _begin   = conn.beginTransaction.bind(conn);
  const _commit  = conn.commit.bind(conn);
  const _roll    = conn.rollback.bind(conn);

  conn.execute = (...a) => serialize(() => _execute(...a));
  conn.query   = (...a) => serialize(() => _query(...a));
  conn.beginTransaction = () => serialize(() => _begin());
  conn.commit  = () => serialize(() => _commit());
  conn.rollback= () => serialize(() => _roll());

  // לא לאפשר סגירה בטעות; נסגור רק בכיבוי השרת
  conn.end = async () => {};

  // keep-alive + נסיון reconnect אם נפל
  setInterval(async () => {
    try {
      await conn.ping();
    } catch {
      await reconnect();
    }
  }, 60_000);

  console.log("[db] single MySQL connection is ready");
  return conn;
}

async function reconnect() {
  try { if (conn && conn.destroy) conn.destroy(); } catch {}
  conn = null;
  return connect();
}

async function getConnection() {
  return connect();
}

process.on("SIGINT", async () => {
  try { if (conn && conn.destroy) conn.destroy(); } catch {}
  process.exit(0);
});

module.exports = { getConnection };
