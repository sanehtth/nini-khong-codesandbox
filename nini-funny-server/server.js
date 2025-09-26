/**
 * server.js — NiNi Funny (Render)
 * --------------------------------
 * YÊU CẦU BIẾN MÔI TRƯỜNG (Render → Environment):
 *
 * - APP_PUBLIC_URL=https://nini-funny.com            # domain Netlify của bạn
 * - CORS_ORIGIN=https://nini-funny.com               # (tùy chọn, nếu không có sẽ dùng APP_PUBLIC_URL)
 *
 * # SMTP (bắt buộc để gửi mail):
 * - SMTP_HOST=mail9066.maychumail.com
 * - SMTP_PORT=587
 * - SMTP_SECURE=false                                # "true" nếu dùng 465
 * - SMTP_USER=no-reply@nini-funny.com
 * - SMTP_PASS=***your_password***
 * - FROM_EMAIL=no-reply@nini-funny.com               # địa chỉ hiển thị ở "From"
 * - FROM_NAME=NiNi Funny                             # tên hiển thị ở "From"
 *
 * # Firebase Admin (tùy chọn — nếu muốn tạo reset link bằng Firebase):
 * - FIREBASE_PROJECT_ID=nini-8f3d4
 * - FIREBASE_CLIENT_EMAIL=***@***.iam.gserviceaccount.com
 * - FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n... \n-----END PRIVATE KEY-----\n
 *
 * Cổng:
 * - PORT=3000 (Render tự truyền)
 */

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const nodemailer = require("nodemailer");

// Dùng dotenv khi chạy local (Render bỏ qua cũng không sao)
try { require("dotenv").config(); } catch (_) {}

const app = express();

/* ============ Cấu hình chung ============ */
const APP_PUBLIC_URL = process.env.APP_PUBLIC_URL || "http://localhost:8888";
const CORS_ORIGIN = process.env.CORS_ORIGIN || APP_PUBLIC_URL;

// Bật middleware
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(compression());
app.use(express.json());

// CORS cho preflight
app.use(
  cors({
    origin: CORS_ORIGIN,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
  })
);
app.options("*", cors());

/* ============ Firebase Admin (OPTIONAL) ============ */
let admin = null;
let canUseFirebase = false;

try {
  const needFirebase =
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY;

  if (needFirebase) {
    // Tránh load 2 lần trên Render
    // eslint-disable-next-line global-require
    admin = require("firebase-admin");
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // Render / Netlify thường phải replace \n
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        }),
      });
    }
    canUseFirebase = true;
    console.log("[Firebase] Initialized");
  } else {
    console.log("[Firebase] Skipped (missing envs).");
  }
} catch (e) {
  console.warn("[Firebase] Init error:", e?.message || e);
}

/* ============ Nodemailer Transport (SMTP) ============ */
function createTransport() {
  const secure = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

/* ============ Template Email ============ */
function renderResetEmail({ resetLink, email }) {
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.6">
    <h2>Đặt lại mật khẩu NiNi — Funny</h2>
    <p>Xin chào <b>${email}</b>,</p>
    <p>Bạn (hoặc ai đó) vừa yêu cầu đặt lại mật khẩu cho tài khoản NiNi — Funny.</p>
    <p>Nhấn vào nút dưới đây để tiếp tục:</p>
    <p>
      <a href="${resetLink}"
         style="display:inline-block;padding:10px 16px;border-radius:10px;background:#22c55e;color:#fff;text-decoration:none">
        Đặt lại mật khẩu
      </a>
    </p>
    <p>Nếu bạn không yêu cầu thao tác này, vui lòng bỏ qua email.</p>
    <hr/>
    <p style="color:#64748b">NiNi — Funny</p>
  </div>
  `;
}

/* ============ Helpers ============ */
function bad(res, message = "Invalid request") {
  return res.status(400).json({ ok: false, message });
}
function ok(res, data = {}) {
  return res.json({ ok: true, ...data });
}

/* ============ Routes ============ */

// Health-check
app.get("/api/ping", (req, res) => {
  res.json({ message: "pong", at: new Date().toISOString() });
});

/**
 * POST /api/send-reset
 * body: { email: string }
 */
app.post("/api/send-reset", async (req, res) => {
  try {
    const email = (req.body?.email || "").trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return bad(res, "Email không hợp lệ");
    }

    // 1) Tạo resetLink
    let resetLink;

    if (canUseFirebase) {
      // Dùng Firebase để tạo link reset password "chính thống"
      const fbLink = await admin.auth().generatePasswordResetLink(email, {
        url: `${APP_PUBLIC_URL}/reset-password.html`, // trang sẽ nhận oobCode
        handleCodeInApp: false,
      });
      resetLink = fbLink; // đã có đầy đủ mode=resetPassword&oobCode=...
    } else {
      // Fallback: tự tạo link trỏ về trang reset của bạn (không có oobCode)
      // Người dùng sẽ đặt mật khẩu theo flow riêng của bạn.
      // Nếu bạn dùng Firebase phía client, bạn nên bật Firebase ở server để có oobCode.
      resetLink = `${APP_PUBLIC_URL}/reset-password.html?email=${encodeURIComponent(email)}`;
    }

    // 2) Gửi email
    const transporter = createTransport();

    const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER;
    const fromName = process.env.FROM_NAME || "NiNi Funny";

    const htmlBody = renderResetEmail({ resetLink, email });

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: email,
      subject: "Đặt lại mật khẩu NiNi — Funny",
      html: htmlBody,
    });

    return ok(res, { message: "Đã gửi email đặt lại mật khẩu." });
  } catch (err) {
    console.error("[/api/send-reset] error:", err);
    return res.status(500).json({
      ok: false,
      message: "Gửi không thành công. Vui lòng thử lại sau!",
      error: String(err?.message || err),
    });
  }
});

// 404 JSON cho /api/*
app.use("/api", (req, res) => {
  res.status(404).json({ ok: false, message: "API not found" });
});

// 404 text cho các route khác (tránh Render trả 502 khó hiểu)
app.use((req, res) => {
  res.status(404).type("text").send("Not Found");
});

/* ============ Khởi động server ============ */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`→ NiNi server is running on :${PORT}`);
  console.log(`CORS origin: ${CORS_ORIGIN}`);
  console.log(`Public URL: ${APP_PUBLIC_URL}`);
});
