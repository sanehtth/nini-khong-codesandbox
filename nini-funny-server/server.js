// nini-funny-server/server.js  (CommonJS)
// Bản đã thêm: per-user key, provider OpenAI/Grok, 3 route storyboard, /admin/update-env

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');
const nodemailer = require('nodemailer');

const app = express();

// ===== CORS =====
const ALLOW_ORIGIN = process.env.CORS_ORIGIN || 'https://nini-funny.com';
app.use(cors({
  origin: ALLOW_ORIGIN,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-openai-key', 'x-grok-key', 'x-provider', 'x-admin-token'],
  credentials: false
}));
app.use(express.json());

// Trả preflight 204
app.options('*', (req, res) => {
  res.set({
    'Access-Control-Allow-Origin': ALLOW_ORIGIN,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-openai-key, x-grok-key, x-provider, x-admin-token',
  });
  return res.status(204).end();
});

// ===== Healthcheck / Ping =====
app.get('/api/ping', (req, res) => {
  res.set('Access-Control-Allow-Origin', ALLOW_ORIGIN);
  return res.json({ ok: true, ts: Date.now() });
});

// ===== (Tuỳ bạn) /api/send-reset  =====
const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = (process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_EMAIL = process.env.SMTP_EMAIL || 'no-reply@nini-funny.com';

let transporter = null;
if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

app.post('/api/send-reset', async (req, res) => {
  try {
    if (!transporter) return res.status(500).json({ error: 'SMTP not configured on server' });
    const { email, resetLink } = req.body || {};
    if (!email || !resetLink) return res.status(400).json({ error: 'Missing email or resetLink' });

    const templatePath = path.resolve(__dirname, 'email_reset_template.html');
    let html = `<p>Reset link: <a href="${resetLink}">${resetLink}</a></p>`;
    if (fs.existsSync(templatePath)) {
      const raw = fs.readFileSync(templatePath, 'utf8');
      html = raw.replace('{{resetLink}}', resetLink).replace('{{email}}', email);
    }
    await transporter.sendMail({ from: SMTP_EMAIL, to: email, subject: 'Reset your password for NiNi — funny', html });
    res.set('Access-Control-Allow-Origin', ALLOW_ORIGIN);
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'send-reset failed' });
  }
});

// ==== [ADDED] Admin update env START ====
app.post('/admin/update-env', async (req, res) => {
  try {
    const token = req.headers['x-admin-token'];
    if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { openaiKey, googleKey, corsOrigin, grokKey } = req.body || {};
    if (!openaiKey && !googleKey && !corsOrigin && !grokKey) {
      return res.status(400).json({ error: 'No changes provided' });
    }

    // cập nhật RAM
    if (openaiKey) process.env.OPENAI_API_KEY = openaiKey;
    if (googleKey) process.env.GOOGLE_API_KEY = googleKey;
    if (grokKey)   process.env.GROK_API_KEY = grokKey;
    if (corsOrigin) process.env.CORS_ORIGIN = corsOrigin;

    // cập nhật .env (merge giữ giá trị cũ khác)
    const envPath = path.resolve(__dirname, '.env');
    let current = {};
    try {
      const txt = fs.readFileSync(envPath, 'utf8');
      txt.split(/\r?\n/).forEach(l => {
        if (!l.trim() || l.startsWith('#')) return;
        const i = l.indexOf('=');
        if (i > -1) current[l.slice(0, i)] = l.slice(i + 1);
      });
    } catch (_) {}
    if (openaiKey) current.OPENAI_API_KEY = openaiKey;
    if (googleKey) current.GOOGLE_API_KEY = googleKey;
    if (grokKey)   current.GROK_API_KEY = grokKey;
    if (corsOrigin) current.CORS_ORIGIN = corsOrigin;
    if (!current.PORT && process.env.PORT) current.PORT = process.env.PORT;

    const out = Object.entries(current).map(([k, v]) => `${k}=${v}`).join(os.EOL) + os.EOL;
    fs.writeFileSync(envPath, out, 'utf8');

    res.set('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
    return res.json({ ok: true, message: 'Updated .env successfully' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'update-env failed' });
  }
});
// ==== [ADDED] Admin update env END ====

// ==== [ADDED: provider + grok adapter] START ====
// ESM fetch trong CJS
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

function getProvider(req){
  const p = String(req.headers['x-provider'] || '').toLowerCase();
  return (p === 'grok' || p === 'openai') ? p : 'openai';
}
function getOpenAIKey(req){
  const k = req.headers['x-openai-key'];
  return (k && String(k).trim()) || process.env.OPENAI_API_KEY || '';
}
function getGrokKey(req){
  const k = req.headers['x-grok-key'];
  return (k && String(k).trim()) || process.env.GROK_API_KEY || '';
}

// OpenAI chat
async function chatOpenAI(apiKey, system, user){
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY');
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini', // model rẻ - bạn có thể đổi
      temperature: 0.9,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }]
    })
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || 'OpenAI error');
  return j.choices?.[0]?.message?.content || '';
}

// Grok (xAI) chat — mẫu; nếu doc mới khác URL/model, chỉ cần sửa 2 chỗ dưới
async function chatGrok(apiKey, system, user){
  if (!apiKey) throw new Error('Missing GROK_API_KEY');
  const r = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'grok-2-mini', // hoặc 'grok-2'
      temperature: 0.9,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }]
    })
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || 'Grok error');
  return j.choices?.[0]?.message?.content || '';
}

async function chatCompleteUnified(req, system, user){
  const provider = getProvider(req);
  if (provider === 'grok') return chatGrok(getGrokKey(req), system, user);
  return chatOpenAI(getOpenAIKey(req), system, user);
}
// ==== [ADDED: provider + grok adapter] END ====


/**
 * 1) Ý tưởng -> Kịch bản
 */
app.post('/api/script', async (req, res) => {
  try {
    const { ideaText } = req.body || {};
    if (!ideaText) return res.status(400).json({ error: 'Missing ideaText' });

    const system = 'Bạn là biên kịch/đạo diễn, viết kịch bản quay ngắn, điện ảnh Việt hiện đại.';
    const user = `Từ Ý TƯỞNG sau, tạo KỊCH BẢN QUAY (2–4 phút):
- Logline (1 câu)
- 3 Hồi (setup – confrontation – resolution)
- Nhân vật (2–4), Bối cảnh (1–2, ánh sáng/màu)
- Nhịp/BPM, cấu trúc bài hát nếu là MV
- Thời lượng từng phân đoạn (mỗi 30s)
- Lời thoại ngắn (nếu có)

Ý TƯỞNG: ${ideaText}
Giọng điệu: chân thật, ấm áp, nhiều chi tiết hình ảnh quay được.`;

    const script = await chatCompleteUnified(req, system, user);
    res.set('Access-Control-Allow-Origin', ALLOW_ORIGIN);
    return res.json({ script });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || 'script failed' });
  }
});

/**
 * 2) Kịch bản -> Shotlist 5s/cảnh
 */
app.post('/api/shotlist', async (req, res) => {
  try {
    const { script, durationMinutes = 3.5 } = req.body || {};
    if (!script) return res.status(400).json({ error: 'Missing script' });

    const system = 'Bạn là trợ lý đạo diễn, tạo shotlist 5s/cảnh rõ ràng.';
    const user = `Tạo SHOTLIST 5 GIÂY/MỘT CẢNH cho tổng thời lượng ~${durationMinutes} phút.
Mỗi dòng: Timecode; Nội dung khung hình (1–2 câu); Góc máy; Ánh sáng & màu; Cảm xúc.

KỊCH BẢN:
${script}

Phong cách quay: mộc, tự nhiên, quán cafe tone vàng ấm; cảnh mưa tone xanh lạnh.`;

    const shotlist = await chatCompleteUnified(req, system, user);
    res.set('Access-Control-Allow-Origin', ALLOW_ORIGIN);
    return res.json({ shotlist });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || 'shotlist failed' });
  }
});

/**
 * 3) Shotlist -> Prompt cho CẢ HAI (OpenAI & Google)
 */
app.post('/api/prompts/both', async (req, res) => {
  try {
    const { shotlist, options } = req.body || {};
    if (!shotlist) return res.status(400).json({ error: 'Missing shotlist' });

    const {
      artistic=false, realistic=true, documentary=false, surreal=false,
      cinematicLevel=3, detailLevel=3, warmth=3, mood='romantic',
      language='vi', lensTerms=true, naturalTone=true
    } = options || {};

    const styleHints = [
      artistic ? 'nghệ thuật, bố cục táo bạo' : '',
      realistic ? 'hiện thực, đời thường' : '',
      documentary ? 'quan sát kiểu phim tài liệu' : '',
      surreal ? 'hơi siêu thực, mơ màng' : '',
      `mức cinematic: ${cinematicLevel}/5`,
      `mức chi tiết: ${detailLevel}/5`,
      `độ ấm màu: ${warmth}/5`,
      `tâm trạng: ${mood}`
    ].filter(Boolean).join('; ');

    const langNote = language === 'en'
      ? 'Write outputs in concise English.'
      : 'Viết đầu ra bằng tiếng Việt, ngắn gọn, dễ hiểu.';

    const system = `Bạn là hoạ sĩ storyboard kiêm biên tập viên prompt. ${langNote}`;
    const user = `Bạn bắt buộc trả về **JSON array**. Mỗi phần tử là 1 cảnh:
{
  "scene": <number | string timecode>,
  "timecode": "<optional>",
  "openai": {
    "label": "OPENAI",
    "prompt": "OPENAI::<prompt cinematic, có thể film grain/bokeh/DOF/35mm, không chữ>",
    "notes": { "compat": "DALL·E/Stable: ưa thuật ngữ nhiếp ảnh.", "dos": ["..."], "donts": ["..."] }
  },
  "google": {
    "label": "GOOGLE",
    "prompt": "GOOGLE::<prompt ngắn gọn, tự nhiên, ít kỹ thuật, không chữ>",
    "notes": { "compat": "Imagen/Gemini: ưa văn phong tự nhiên.", "dos": ["..."], "donts": ["..."] }
  }
}
Áp dụng preset: ${styleHints}
OpenAI: ${lensTerms ? 'CHO PHÉP thuật ngữ nhiếp ảnh mức vừa.' : 'HẠN CHẾ thuật ngữ nhiếp ảnh.'}
Google: ${naturalTone ? 'ƯU TIÊN ngôn ngữ tự nhiên, câu ngắn.' : 'Có thể chi tiết hơn nhưng tự nhiên.'}
Chỉ trả JSON hợp lệ, không thêm text ngoài JSON.

SHOTLIST:
${shotlist}`;

    const promptsBoth = await chatCompleteUnified(req, system, user);
    res.set('Access-Control-Allow-Origin', ALLOW_ORIGIN);
    return res.json({ promptsBoth });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || 'prompts failed' });
  }
});

// 404 handler
app.use((req, res) => {
  res.set('Access-Control-Allow-Origin', ALLOW_ORIGIN);
  return res.status(404).json({ error: 'Not Found', path: req.path });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
