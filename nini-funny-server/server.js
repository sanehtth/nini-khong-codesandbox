/**
 * server.js — NiNi Funny (Render)
 * - Express + CORS/OPTIONS cho preflight
 * - Nodemailer SMTP gửi email
 * - (Tùy chọn) Firebase Admin tạo password reset link
 */

const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const nodemailer = require("nodemailer");

// ========= ENV =========
const {
  PORT = 3000,

  // Front-end origin (domain web của bạn)
  APP_PUBLIC_URL = "https://nini-funny.com",

  // SMTP
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE = "false",
  SMTP_USER,
  SMTP_PASS,

  FROM_EMAIL = "no-reply@nini-funny.com",
  FROM_NAME = "NiNi — Funny",

  // Firebase Admin (tùy chọn)
  FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY
} = process.env;

// ========= APP =========
const app = express();

// Bảo mật & nén
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());

// JSON parser
app.use(express.json());

// ========= CORS (RẤT QUAN TRỌNG) =========
const corsOptions = {
  origin: APP_PUBLIC_URL,                 // chỉ cho phép từ web của bạn
  methods: ["GET", "POST", "OPTIONS"],    // cho phép các method cần thiết
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false
};

// Bật CORS sớm nhất có thể
app.use(cors(corsOptions));

// Đảm bảo mọi preflight đều được trả 204 + header
app.options("*", cors(corsOptions));

// ========= EMAIL TEMPLATE =========
// Bạn có thể đặt file template HTML cạnh server ở ./email_reset_template.html
const templatePath = path.resolve(__dirname, "email_reset_template.html");
let baseTemplate = `<!doctype html>
<html><body>
  <p>Xin chào,</p>
  <p>Bấm vào liên kết sau để đặt lại mật khẩu của bạn:</p>
  <p><a href="{{resetLink}}">{{resetLink}}</a></p>
  <p>Liên hệ hỗ trợ nếu bạn không thực hiện yêu cầu này.</p>
  <p>— NiNi — Funny</p>
</body></html>`;
if (fs.existsSync(templatePath)) {
  baseTemplate = fs.readFileSync(templatePath, "utf8");
}
function renderTemplate(resetLink, email) {
  return baseTemplate
    .replaceAll("{{resetLink}}", resetLink)
    .replaceAll("{{email}}", email || "");
}

// ========= SMTP TRANSPORT =========
if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
  console.warn("[WARN] SMTP env chưa đầy đủ — gửi mail sẽ lỗi.");
}
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT) || 587,
  secure: String(SMTP_SECURE).toLowerCase() === "true",
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS
  }
});

// ========= (TÙY CHỌN) FIREBASE ADMIN =========
let firebaseAdmin = null;
let hasFirebase = false;
try {
  if (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
    const admin = require("firebase-admin");

    // Private key có thể có ký tự \n — chuyển lại đúng dạng
    const fixedKey = FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n");

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        privateKey: fixedKey
      })
    });

    firebaseAdmin = admin;
    hasFirebase = true;
    console.log("[OK] Firebase Admin đã bật.");
  } else {
    console.log("[INFO] Không cấu hình Firebase Admin — sẽ dùng fallback reset URL.");
  }
} catch (e) {
  console.error("[Firebase Admin ERROR]", e);
  hasFirebase = false;
}

// ========= ROUTES =========

// Health check
app.get("/api/ping", (req, res) => {
  res.json({ ok: true, time: Date.now() });
});

// (Bắt buộc) Route OPTIONS riêng cho endpoint — phòng hờ
app.options("/api/send-reset", cors(corsOptions), (req, res) => {
  res.sendStatus(204);
});

/**
 * POST /api/send-reset
 * body: { email: string }
 */
app.post("/api/send-reset", async (req, res) => {
  try {
    const email = String((req.body?.email || "")).trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Email không hợp lệ" });
    }

    // 1) Tạo reset link
    let resetLink = `${APP_PUBLIC_URL}/reset-password.html`;

    if (hasFirebase && firebaseAdmin) {
      try {
        const actionCodeSettings = {
          url: `${APP_PUBLIC_URL}/reset-password.html`,
          handleCodeInApp: false
        };
        resetLink = await firebaseAdmin.auth().generatePasswordResetLink(email, actionCodeSettings);
      } catch (e) {
        console.warn("[WARN] Tạo reset link qua Firebase thất bại. Dùng fallback URL.", e?.message || e);
        // fallback: giữ resetLink mặc định
      }
    }

    // 2) Render HTML
    const htmlBody = renderTemplate(resetLink, email);

    // 3) Gửi mail
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      return res.status(500).json({ error: "SMTP chưa cấu hình" });
    }

    await transporter.sendMail({
      from: {
        name: FROM_NAME,
        address: FROM_EMAIL
      },
      to: email,
      subject: "Đặt lại mật khẩu cho NiNi — Funny",
      html: htmlBody
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("[/api/send-reset] ERROR", err);
    res.status(500).json({ error: "Không gửi được email" });
  }
});

// ========= START =========
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

app.listen(PORT, () => {
  console.log(`[server] Listening on port ${PORT}`);
  console.log(`[server] CORS origin: ${APP_PUBLIC_URL}`);
});
