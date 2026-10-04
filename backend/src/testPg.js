const pool = require('./config/db');

(async () => {
  try {
    const res = await pool.query('SELECT $1::text, $2::text', ['hello', undefined]);
    console.log("SUCCESS:", res.rows);
  } catch (err) {
    console.error("ERROR:", err);
  }
  process.exit(0);
})();
