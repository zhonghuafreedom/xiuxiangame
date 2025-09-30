// backend/server.js
const express = require('express');
const cors = require('cors');

const app = express();

// 在云上常见，开启反向代理信任
app.set('trust proxy', 1);

// 允许跨域 & 解析 JSON
app.use(cors({ origin: true }));                // 允许任何来源（也可改成你的域名）
app.use(express.json({ limit: '1mb' }));        // 限制一下包体积

// ====== 临时存档（内存；重启会丢）======
const saves = Object.create(null);

// 健康检查/根路由（Render/监控会用到）
app.get('/', (_req, res) => res.send('OK'));
app.get('/health', (_req, res) => res.send('ok'));

// 保存存档
app.post('/api/save', (req, res) => {
  const { user, data } = req.body || {};
  if (!user || data == null) {
    return res.status(400).json({ ok: false, error: 'user & data required' });
  }
  saves[user] = data;
  res.json({ ok: true, updatedAt: Date.now() });
});

// 读取存档
app.get('/api/load', (req, res) => {
  const { user } = req.query || {};
  if (!user) {
    return res.status(400).json({ ok: false, error: 'user required' });
  }
  res.json(saves[user] ?? null);
});

// 云平台会注入 PORT；本地则用 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`后端启动成功：http://localhost:${PORT}`);
});