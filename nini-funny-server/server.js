/**
 * NiNi — Funny : server.js (Render)
 * - CORS + preflight cho mọi route
 * - /api/ping để kiểm tra
 * - /api/send-reset: tạo reset link (Firebase Admin nếu có), rồi gửi mail qua SMTP
 */

import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import nodemailer from "nodemailer";

// --- Firebase Admin (tùy chọn) ---
let admin = null;
try {
  const { initializeApp, applicationDefault, cert } = await import("firebase-admin/app");
  const { getAuth } = await import("firebase-admin/auth");

  // Nếu có đủ 3 biến FIREBASE_* thì khởi tạo bằng service account
  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    // Tránh lỗi xuống dòng của private key
    const pk = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n");

    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: pk,
      }),
    });
    admin = { getAuth };
    console.log("[Firebase] Admin initialized with service account.");
  } else {
    console.log("[Firebase] Admin not configured, will fallback to static reset link.");
  }
} catch (e) {
  console.log("[Firebase] Admin not available in this runtime → fallback mode.");
}

// --- ENV ---
const PORT = Number(process.env.PORT || 3000);

// domain front-end (bắt buộc, https)
const CORS_ORIGIN = process.env.CORS_ORIGIN || "https://nini-funny.com";

// URL public của site (dùng để tạo reset link tĩnh khi không có Firebase Admin)
const APP_PUBLIC_URL = process.env.APP_PUBLIC_URL || "https://nini-funny.com";

// Nếu bạn muốn override đích đến cho link reset (khi dùng Firebase Admin)
const RESET_TARGET_URL =
  process.env.RESET_TARGET_URL || `${APP_PUBLIC_URL}/reset-password.html`;

// --- SMTP ENV ---
const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true"; // true nếu 465
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const MAIL_FROM = process.env.MAIL_FROM || "No-Reply <no-reply@nini-funny.com>";
const FROM_NAME = process.env.FROM_NAME || "NiNi — Funny";

// ========= APP =========
const app = express();

// 1) CORS trước tiên
const corsOptions = {
  origin: CORS_ORIGIN,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // trả preflight cho mọi route

// 2) Các middleware khác
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(compression());
app.use(express.json());

// ========= SMTP transporter =========
function buildTransporter() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn("[SMTP] Missing SMTP envs → email sending will fail.");
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

// ========= Helpers =========
function renderEmailHTML(resetLink, email) {
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.6;color:#111">
    <h2 style="margin:0 0 12px">${FROM_NAME}</h2>
    <p>Xin chào <b>${email}</b>,</p>
    <p>Nhấn vào nút dưới đây để đặt lại mật khẩu:</p>
    <p style="margin:16px 0">
      <a href="${resetLink}"
         style="display:inline-block;padding:10px 16px;background:#16a34a;color:#fff;text-decoration:none;border-radius:8px">
         Đặt lại mật khẩu
      </a>
    </p>
    <p>Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
    <hr style="border:none;border-top:1px solid #eee;margin:16px 0" />
    <p style="font-size:12px;color:#666">Liên kết: <a href="${resetLink}">${resetLink}</a></p>
  </div>
  `;
}

function isValidEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s || "");
}

// ========= ROUTES =========
app.get("/api/ping", (req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

/**
 * POST /api/send-reset
 * body: { email }
 */
app.post("/api/send-reset", async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Email không hợp lệ" });
    }

    // 1) Tạo reset link
    let resetLink = `${APP_PUBLIC_URL}/reset-password.html?email=${encodeURIComponent(email)}`;

    // Nếu có Firebase Admin → dùng link chính chủ
    if (admin && typeof admin.getAuth === "function") {
      try {
        const auth = admin.getAuth();
        resetLink = await auth.generatePasswordResetLink(email, {
          url: RESET_TARGET_URL, // nơi trang client xử lý oobCode
          handleCodeInApp: false,
        });
      } catch (e) {
        console.warn("[Firebase] generatePasswordResetLink failed → fallback to static link", e?.message);
      }
    }

    // 2) Gửi email
    const transporter = buildTransporter();
    const htmlBody = renderEmailHTML(resetLink, email);
    await transporter.sendMail({
      from: MAIL_FROM,
      to: email,
      subject: "Đặt lại mật khẩu cho NiNi — Funny",
      html: htmlBody,
    });

    return res.json({ ok: true, message: "Đã gửi email đặt lại mật khẩu." });
  } catch (e) {
    console.error("[send-reset] error:", e);
    return res.status(500).json({ message: "Có lỗi khi gửi email. Thử lại sau ít phút." });
  }
});

// ========= START =========
app.listen(PORT, () => {
  console.log(`NiNi — Funny server is running on port ${PORT}`);
  console.log(`CORS_ORIGIN = ${CORS_ORIGIN}`);
});
