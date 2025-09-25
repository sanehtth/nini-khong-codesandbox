// server.js  (ESM)
// yêu cầu package.json có:  { "type": "module", ... }

import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import * as admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ===== Paths & helpers =====
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const readMaybe  = (p) => (fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null);

// ===== ENV =====
// CORS: cho phép nhiều domain, phân tách bởi dấu phẩy
const CORS_ORIGIN = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

// Mail (SMTP)
const SMTP_HOST   = process.env.SMTP_HOST;
const SMTP_PORT   = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";
const SMTP_USER   = process.env.SMTP_USER;
const SMTP_PASS   = process.env.SMTP_PASS;
const MAIL_FROM   = process.env.MAIL_FROM || `NiNi Funny <${SMTP_USER || "no-reply@example.com"}>`;

// Link đích sau khi người dùng bấm trong email reset
const RESET_TARGET_URL = process.env.RESET_TARGET_URL || "https://nini-funny.com/reset-password.html";

// ===== Firebase Admin init =====
let serviceAccount = null;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  // dạng JSON full
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else if (
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY
) {
  // dạng tách biến
  serviceAccount = {
    projectId:   process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey:  (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
  };
} else {
  // thử đọc file cục bộ nếu dev
  const local = readMaybe(path.join(__dirname, "serviceAccountKey.json"));
  if (local) serviceAccount = JSON.parse(local);
}

if (!serviceAccount) {
  console.error("❌ Firebase service account chưa được cấu hình (FIREBASE_SERVICE_ACCOUNT hoặc 3 biến tách).");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// ===== SMTP transporter =====
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

// ===== App =====
const app = express();

// CORS trước mọi route
app.use(
  cors({
    origin(origin, cb) {
      // allow requests from same-origin / curl (no origin) và các origin trong whitelist
      if (!origin || CORS_ORIGIN.includes(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "OPTIONS"],
  })
);
// preflight
app.options("*", cors());

// parse JSON
app.use(express.json());

// ===== Email template =====
const templatePath = path.join(__dirname, "email_reset_template.html");
const baseTemplate =
  readMaybe(templatePath) ||
  `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto">
    <p>Xin chào {{email}},</p>
    <p>Bạn vừa yêu cầu đặt lại mật khẩu cho NiNi — Funny.</p>
    <p><a href="{{resetLink}}" style="display:inline-block;padding:10px 14px;border-radius:8px;background:#16a34a;color:#fff;text-decoration:none">Đặt lại mật khẩu</a></p>
    <p>Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
    <p>— NiNi Funny team</p>
  </div>`;

function renderResetEmail(resetLink, email) {
  return baseTemplate
    .replaceAll("{{resetLink}}", resetLink)
    .replaceAll("{{email}}", email);
}

// ===== Routes =====
app.get("/", (_req, res) => {
  res.json({ ok: true, service: "nini-funny-server" });
});

app.get("/api/ping", (_req, res) => {
  res.json({ ok: true, time: Date.now() });
});

app.post("/api/send-reset", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Email không hợp lệ" });
    }

    // Link reset từ Firebase
    // (Firebase sẽ sinh link có oobCode; RESET_TARGET_URL để user quay về trang reset của bạn)
    const actionCodeSettings = {
      url: RESET_TARGET_URL,
      handleCodeInApp: false,
    };
    const resetLink = await admin.auth().generatePasswordResetLink(email, actionCodeSettings);

    // Gửi mail bằng SMTP pro
    const html = renderResetEmail(resetLink, email);
    await transporter.sendMail({
      from: MAIL_FROM,       // bắt buộc hiển thị là no-reply@nini-funny.com
      to: email,
      subject: "Reset your password for NiNi — Funny",
      html,
    });

    res.json({ ok: true, message: "Đã gửi email đặt lại mật khẩu." });
  } catch (e) {
    console.error("send-reset error:", e);
    res.status(500).json({ message: e?.message || "Không gửi được email." });
  }
});

// ===== Start =====
const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
  console.log(`✅ nini-funny-server listening on :${PORT}`);
  console.log(`   CORS allow: ${CORS_ORIGIN.join(", ") || "(none)"}`);
});
