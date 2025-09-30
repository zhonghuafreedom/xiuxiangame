// backend/server.js  (CommonJS + Postgres)
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;

// 允许跨域 & 解析 JSON
app.use(cors());
app.use(express.json());

// 连接 Postgres（Render 提供的环境变量）
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

// 初始化表（user+secret 作为复合主键）
async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS saves (
      "user"      TEXT NOT NULL,
      "secret"    TEXT NOT NULL,
      "data"      JSONB,
      "updated_at" TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY ("user","secret")
    )
  `);
  console.log("[db] table ready");
}
init().catch(err => {
  console.error("[db] init error:", err);
  process.exit(1);
});

// 保存
app.post("/api/save", async (req, res) => {
  try {
    const { user, secret, data } = req.body || {};
    if (!user || !secret) {
      return res.status(400).json({ error: "Missing user or secret" });
    }
    const result = await pool.query(
      `
      INSERT INTO saves ("user","secret","data","updated_at")
      VALUES ($1,$2,$3,NOW())
      ON CONFLICT ("user","secret")
      DO UPDATE SET "data" = EXCLUDED."data", "updated_at" = NOW()
      RETURNING "updated_at"
      `,
      [user, secret, data ?? {}]
    );
    return res.json({ ok: true, updatedAt: result.rows[0].updated_at });
  } catch (err) {
    console.error("[api] save error:", err);
    return res.status(500).json({ error: "DB error" });
  }
});

// 读取
app.get("/api/load", async (req, res) => {
  try {
    const { user, secret } = req.query || {};
    if (!user || !secret) {
      return res.status(400).json({ error: "Missing user or secret" });
    }
    const result = await pool.query(
      `SELECT "data" FROM saves WHERE "user" = $1 AND "secret" = $2`,
      [user, secret]
    );
    if (result.rowCount === 0) return res.json(null);
    return res.json(result.rows[0].data ?? {});
  } catch (err) {
    console.error("[api] load error:", err);
    return res.status(500).json({ error: "DB error" });
  }
});

// 健康检查
app.get("/health", (_req, res) => res.send("ok"));

// 启动
app.listen(PORT, () => {
  console.log(`Server on :${PORT}`);
});