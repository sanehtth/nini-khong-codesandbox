// nini-funny-server/server.js  (CommonJS)
// Giữ nguyên cấu trúc ban đầu của bạn + bổ sung per-user key cho OpenAI

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
  allowedHeaders: ['Content-Type', 'Authorization', 'x-openai-key'], // cho phép header user key
  credentials: false
}));
app.use(express.json());

// Trả preflight 204 (để Chrome không chặn)
app.options('*', (req, res) => {
  res.set({
    'Access-Control-Allow-Origin': ALLOW_ORIGIN,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-openai-key',
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
      from: SMTP_EMAIL,
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


// ==== [ADDED for per-user key] START ====

// node-fetch (ESM) dùng trong CommonJS
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

/**
 * Lấy OpenAI API key:
 * - ƯU TIÊN key người dùng gửi qua header 'x-openai-key'
 * - Nếu không có, fallback về OPENAI_API_KEY trong .env
 */
function getOpenAIKey(req) {
  const k = req.headers['x-openai-key'];
  return (k && String(k).trim()) || process.env.OPENAI_API_KEY || '';
}

/**
 * Gọi Chat Completions bằng apiKey truyền vào (per-user)
 */
async function chatCompleteWithKey(apiKey, system, user) {
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY');
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',   // đổi nếu bạn muốn model khác
      temperature: 0.9,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ]
    })
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || 'OpenAI error');
  return j.choices?.[0]?.message?.content || '';
}
// ==== [ADDED for per-user key] END ====


/**
 * 1) Ý tưởng -> Kịch bản
 * Body: { ideaText: string }
 * Res:  { script: string }
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

    const script = await chatCompleteWithKey(getOpenAIKey(req), system, user);
    res.set('Access-Control-Allow-Origin', ALLOW_ORIGIN);
    return res.json({ script });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || 'script failed' });
  }
});

/**
 * 2) Kịch bản -> Shotlist 5s/cảnh
 * Body: { script: string, durationMinutes?: number }
 * Res:  { shotlist: string }
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

    const shotlist = await chatCompleteWithKey(getOpenAIKey(req), system, user);
    res.set('Access-Control-Allow-Origin', ALLOW_ORIGIN);
    return res.json({ shotlist });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || 'shotlist failed' });
  }
});

/**
 * 3) Shotlist -> Prompt cho CẢ HAI (OpenAI & Google)
 * Body: { shotlist: string, options?: {...} }
 * Res:  { promptsBoth: string(JSON array) }
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

    const promptsBoth = await chatCompleteWithKey(getOpenAIKey(req), system, user);
    res.set('Access-Control-Allow-Origin', ALLOW_ORIGIN);
    return res.json({ promptsBoth });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || 'prompts failed' });
  }
});


// 404 handler (để debug đường sai)
app.use((req, res) => {
  res.set('Access-Control-Allow-Origin', ALLOW_ORIGIN);
  return res.status(404).json({ error: 'Not Found', path: req.path });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
