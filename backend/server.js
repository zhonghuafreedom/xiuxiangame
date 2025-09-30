// backend/server.js  —— 直接整文件替换用
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.set('trust proxy', 1);
app.use(cors({ origin: true }));
app.use(express.json({ limit: '1mb' }));

// 连接池（Render 需要 SSL）
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // .env 必须是完整URL并带 ?sslmode=require
  ssl: { rejectUnauthorized: false },
});

// 启动即确保表存在
async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS saves (
      player_id  TEXT PRIMARY KEY,
      progress   JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log('✅ 数据表就绪');
}

// 健康检查
app.get('/', (_req, res) => res.send('ok'));
app.get('/health', (_req, res) => res.send('ok'));

// 保存：POST /api/save  body:{ user, data }
app.post('/api/save', async (req, res) => {
  try {
    const { user, data } = req.body || {};
    if (!user || data == null) {
      return res.status(400).json({ ok: false, error: 'user & data required' });
    }
    await ensureTable();
    await pool.query(
      `INSERT INTO saves (player_id, progress, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (player_id)
       DO UPDATE SET progress = EXCLUDED.progress, updated_at = NOW()`,
      [user, JSON.stringify(data)]
    );
    return res.json({ ok: true, updatedAt: Date.now() });
  } catch (err) {
    console.error('DB SAVE ERROR:', err.message, err.detail || '');
    return res.status(500).json({ ok: false, error: 'db error' });
  }
});

// 读取：GET /api/load?user=xxx
app.get('/api/load', async (req, res) => {
  try {
    const user = req.query.user || '';
    if (!user) return res.status(400).json({ ok: false, error: 'user required' });
    await ensureTable();
    const { rows } = await pool.query(
      `SELECT progress FROM saves WHERE player_id = $1`,
      [user]
    );
    return res.json(rows[0]?.progress ?? null);
  } catch (err) {
    console.error('DB LOAD ERROR:', err.message, err.detail || '');
    return res.status(500).json({ ok: false, error: 'db error' });
  }
});

// 启动
const PORT = process.env.PORT || 3000;
(async () => {
  try {
    await pool.connect();
    console.log('✅ 数据库连接成功');
    await ensureTable();
    app.listen(PORT, () => console.log(`✅ 后端启动成功，端口：${PORT}`));
  } catch (e) {
    console.error('❌ 启动失败：', e.message);
    process.exit(1);
  }
})();