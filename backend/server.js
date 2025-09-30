const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// 临时保存存档（服务器重启会丢）
let saves = {};

app.post('/api/save', (req, res) => {
  const { user, data } = req.body;
  saves[user] = data;
  res.send({ ok: true });
});

app.get('/api/load', (req, res) => {
  const { user } = req.query;
  res.send(saves[user] || null);
});

app.listen(3000, () => console.log('后端启动成功：http://localhost:3000'));