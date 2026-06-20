const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Render provides DATABASE_URL automatically when you attach a Postgres instance.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS logs (
      date TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  `);
}
init().catch(err => console.error('DB init failed', err));

// Simple shared-secret auth so randoms on the internet can't write to your log.
// Set API_KEY in Render's environment variables, and the same value in the frontend.
function checkAuth(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!process.env.API_KEY || key === process.env.API_KEY) return next();
  return res.status(401).json({ error: 'unauthorized' });
}

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Get a single day's data
app.get('/api/logs/:date', checkAuth, async (req, res) => {
  try {
    const { date } = req.params;
    const result = await pool.query('SELECT data FROM logs WHERE date = $1', [date]);
    if (result.rows.length === 0) return res.json({ data: null });
    res.json({ data: result.rows[0].data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

// Save/overwrite a single day's data
app.put('/api/logs/:date', checkAuth, async (req, res) => {
  try {
    const { date } = req.params;
    const { data } = req.body;
    await pool.query(
      `INSERT INTO logs (date, data, updated_at) VALUES ($1, $2, now())
       ON CONFLICT (date) DO UPDATE SET data = $2, updated_at = now()`,
      [date, data]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

// Get multiple days at once (for the 7-day history strip) - comma separated dates
app.get('/api/logs-batch', checkAuth, async (req, res) => {
  try {
    const dates = (req.query.dates || '').split(',').filter(Boolean);
    if (dates.length === 0) return res.json({ results: {} });
    const result = await pool.query('SELECT date, data FROM logs WHERE date = ANY($1)', [dates]);
    const results = {};
    result.rows.forEach(r => { results[r.date] = r.data; });
    res.json({ results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
