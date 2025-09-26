// server.js  (CommonJS cho đơn giản)
const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const nodemailer = require("nodemailer");
const admin = require("firebase-admin");

const PORT = process.env.PORT || 3000;

/* ========== CORS ========== */
// ALLOWED_ORIGINS: ví dụ "https://nini-funny.com,http://localhost:8888"
const ALLOWED = (process.env.ALLOWED_ORIGINS || "https://nini-funny.com,http://localhost:8888")
  .split(",")
  .map(s => s.trim());

const corsMiddleware = (req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
};

const app = express();
app.use(express.json());
app.use(corsMiddleware);
//moi them
app.use(express.json());

// --- CORS "chắc chắn" cho giai đoạn test ---
app.use((req, res, next) => {
  // CHỈ test: mở full. Khi xong sẽ siết lại domain.
  res.setHeader('Access-Control-Allow-Origin', '*');      // ← test
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  // Nếu cần cookie thì thêm: res.setHeader('Access-Control-Allow-Credentials','true')
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

/* ========== Firebase Admin ========== */
// Dùng biến môi trường thay cho file JSON
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  token_uri: "https://oauth2.googleapis.com/token",
};

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

/* ========== SMTP transporter ========== */
// SMTP_*: thông số mail pro của bạn
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,             // vd: mail9066.maychuemail.com
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE || "false").toLowerCase() === "true",
  auth: {
    user: process.env.SMTP_USER,           // vd: no-reply@nini-funny.com
    pass: process.env.SMTP_PASS,
  },
});

/* ========== Email template ========== */
const baseTemplatePath = path.resolve(__dirname, "email_reset_template.html");
const baseTemplate = fs.existsSync(baseTemplatePath)
  ? fs.readFileSync(baseTemplatePath, "utf8")
  : `<div>
      <p>Xin chào {{email}},</p>
      <p>Bạn vừa yêu cầu đặt lại mật khẩu. Bấm vào liên kết dưới đây:</p>
      <p><a href="{{resetLink}}">Đặt lại mật khẩu</a></p>
      <p>Nếu không phải bạn, vui lòng bỏ qua email này.</p>
     </div>`;

/* ========== Health check ========== */
app.get("/api/ping", (req, res) => {
  res.json({ ok: true, message: "pong" });
});

/* ========== API gửi email reset ========== */
app.post("/api/send-reset", async (req, res) => {
  const { email } = req.body || {};
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ ok: false, message: "Email không hợp lệ" });
  }

  try {
    const actionCodeSettings = {
      // URL trang reset trên web tĩnh của bạn
      url: process.env.RESET_TARGET_URL || "https://nini-funny.com/reset-password.html",
      handleCodeInApp: false,
    };

    const resetLink = await admin.auth().generatePasswordResetLink(email, actionCodeSettings);

    const htmlBody = baseTemplate
      .replaceAll("{{resetLink}}", resetLink)
      .replaceAll("{{email}}", email);

    await transporter.sendMail({
      from: process.env.MAIL_FROM || '"NiNi Funny" <no-reply@nini-funny.com>',
      to: email,
      subject: "Reset your password for NiNi–Funny",
      html: htmlBody,
    });

    res.json({ ok: true, message: "Đã gửi email đặt lại mật khẩu." });
  } catch (err) {
    console.error("send-reset error:", err);
    const msg =
      err?.errorInfo?.message ||
      err?.message ||
      "Không gửi được email. Vui lòng thử lại!";
    res.status(400).json({ ok: false, message: msg });
  }
});

/* ========== Start ========== */
app.listen(PORT, () => {
  console.log("Server listening on port", PORT);
});

