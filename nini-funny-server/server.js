// nini-funny-server/server.js  (CommonJS)
// Nếu dự án bạn đang dùng "type":"module" thì mình có bản ESModule ở dưới.

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');

const app = express();

// ===== CORS =====
const ALLOW_ORIGIN = process.env.CORS_ORIGIN || 'https://nini-funny.com';
app.use(cors({
  origin: ALLOW_ORIGIN,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));
app.use(express.json());

// Trả preflight 204 (để Chrome không chặn)
app.options('*', (req, res) => {
  res.set({
    'Access-Control-Allow-Origin': ALLOW_ORIGIN,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  return res.status(204).end();
});

// ===== Healthcheck / Ping =====
app.get('/api/ping', (req, res) => {
  res.set('Access-Control-Allow-Origin', ALLOW_ORIGIN);
  return res.json({ ok: true, ts: Date.now() });
});

// ====== (Tuỳ bạn) /api/send-reset  ======
// Giữ nguyên logic cũ của bạn ở đây. Ví dụ khung gửi mail:
const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = (process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const MAIL_FROM = process.env.MAIL_FROM || 'no-reply@nini-funny.com';

let transporter = null;
if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

// Ví dụ endpoint nhận { email, resetLink } và gửi mail (nếu bạn muốn)
app.post('/api/send-reset', async (req, res) => {
  try {
    if (!transporter) {
      return res.status(500).json({ error: 'SMTP not configured on server' });
    }
    const { email, resetLink } = req.body || {};
    if (!email || !resetLink) {
      return res.status(400).json({ error: 'Missing email or resetLink' });
    }

    // đọc template nếu có
    const templatePath = path.resolve(__dirname, 'email_reset_template.html');
    let html = `<p>Reset link: <a href="${resetLink}">${resetLink}</a></p>`;
    if (fs.existsSync(templatePath)) {
      const raw = fs.readFileSync(templatePath, 'utf8');
      html = raw.replace('{{resetLink}}', resetLink).replace('{{email}}', email);
    }

    await transporter.sendMail({
      from: MAIL_FROM,
      to: email,
      subject: 'Reset your password for NiNi — funny',
      html,
    });

    res.set('Access-Control-Allow-Origin', ALLOW_ORIGIN);
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'send-reset failed' });
  }
});

// 404 handler (để debug đường sai)
app.use((req, res) => {
  res.set('Access-Control-Allow-Origin', ALLOW_ORIGIN);
  return res.status(404).json({ error: 'Not Found', path: req.path });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
