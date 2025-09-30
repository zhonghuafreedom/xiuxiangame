// backend/server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// 数据存储（临时内存版，重启会丢失）
const saves = {};

// ================== API 路由 ==================

// 保存
app.post('/api/save', (req, res) => {
  try {
    const { user, secret, data } = req.body;
    if (!user || !secret) {
      return res.status(400).json({ ok: false, error: '缺少 user 或 secret' });
    }
    const key = `${user}::${secret}`;
    saves[key] = {
      updatedAt: new Date().toISOString(),
      data: data || {}
    };
    console.log('[SAVE]', key);
    res.json({ ok: true, updatedAt: saves[key].updatedAt });
  } catch (err) {
    console.error('Save error:', err);
    res.status(500).json({ ok: false, error: '服务器错误' });
  }
});

// 读取
app.get('/api/load', (req, res) => {
  try {
    const { user, secret } = req.query;
    if (!user || !secret) {
      return res.status(400).json({ ok: false, error: '缺少 user 或 secret' });
    }
    const key = `${user}::${secret}`;
    const record = saves[key];
    if (!record) {
      return res.json({ ok: false, error: '没有找到存档' });
    }
    res.json({ ok: true, ...record });
  } catch (err) {
    console.error('Load error:', err);
    res.status(500).json({ ok: false, error: '服务器错误' });
  }
});

// ================== 监听端口 ==================
const PORT = process.env.PORT || 4322;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});