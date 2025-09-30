// server.js
import express from "express";
import sqlite3 from "sqlite3";
import bodyParser from "body-parser";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

// === 中间件 ===
app.use(cors());
app.use(bodyParser.json());

// === 数据库初始化 ===
const db = new sqlite3.Database("game.db");

db.serialize(() => {
  db.run(
    `CREATE TABLE IF NOT EXISTS saves (
        user   TEXT NOT NULL,
        secret TEXT NOT NULL,
        data   TEXT,
        updatedAt INTEGER,
        PRIMARY KEY (user, secret)
    )`
  );
});

// === 保存存档 ===
app.post("/api/save", (req, res) => {
  const { user, secret, data } = req.body;
  if (!user || !secret) {
    return res.status(400).json({ error: "Missing user or secret" });
  }

  const updatedAt = Date.now();
  db.run(
    `INSERT INTO saves (user, secret, data, updatedAt)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user, secret)
     DO UPDATE SET data = excluded.data, updatedAt = excluded.updatedAt`,
    [user, secret, JSON.stringify(data || {}), updatedAt],
    function (err) {
      if (err) {
        console.error("DB save error:", err);
        return res.status(500).json({ error: "DB error" });
      }
      res.json({ ok: true, updatedAt });
    }
  );
});

// === 读取存档 ===
app.get("/api/load", (req, res) => {
  const { user, secret } = req.query;
  if (!user || !secret) {
    return res.status(400).json({ error: "Missing user or secret" });
  }

  db.get(
    `SELECT data FROM saves WHERE user = ? AND secret = ?`,
    [user, secret],
    (err, row) => {
      if (err) {
        console.error("DB load error:", err);
        return res.status(500).json({ error: "DB error" });
      }
      if (!row) return res.json(null);
      try {
        res.json(JSON.parse(row.data));
      } catch (e) {
        res.json({});
      }
    }
  );
});

// === 健康检查 ===
app.get("/health", (req, res) => {
  res.send("ok");
});

// === 启动服务 ===
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});