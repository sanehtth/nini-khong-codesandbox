// server.js
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();
app.use(express.json());

// ===== CORS =====
// Cho phép web-app của bạn (Netlify) gọi sang server (Render)
const ALLOW_ORIGINS = [
  "https://nini-funny.com",          // domain Netlify của bạn
  "http://localhost:5173",           // nếu có chạy local
  "http://localhost:3000"
];

app.use(
  cors({
    origin(origin, cb) {
      // cho phép cả Postman/cURL (không có origin)
      if (!origin) return cb(null, true);
      if (ALLOW_ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    maxAge: 86400
  })
);

// Trả preflight cho mọi route
app.options("*", cors());

// ===== SMTP transporter (mail pro của bạn) =====
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,                          // ví dụ: mail9066.maychuemail.com
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE || "false").toLowerCase() === "true",
  auth: {
    user: process.env.SMTP_USER,                        // ví dụ: no-reply@nini-funny.com
    pass: process.env.SMTP_PASS
  }
});

// ===== Template mail đơn giản (nếu chưa dùng file HTML) =====
function renderResetEmail(resetLink) {
  return `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial">
      <h2>Reset your password for NiNi-funny</h2>
      <p>Click the link below to set a new password:</p>
      <p>
        <a href="${resetLink}" style="background:#2e7d32;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Set new password</a>
      </p>
      <p>If the button doesn't work, copy this link:</p>
      <code>${resetLink}</code>
      <hr/>
      <small>This link will expire soon. If you didn't request it, you can ignore this email.</small>
    </div>
  `;
}

// ===== Health check =====
app.get("/api/ping", (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// ===== Gửi email reset (frontend sẽ gọi endpoint này) =====
app.post("/api/send-reset", async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Invalid email" });
    }

    // Link reset (Firebase handle link): reset-password.html của bạn
    // Client sẽ đọc oobCode trên trang này để xác nhận đặt lại mật khẩu
    const base = process.env.RESET_TARGET_URL || "https://nini-funny.com/reset-password.html";
    // Ở đây ta chỉ gửi link đến trang hướng dẫn. Nếu muốn dùng oobCode của Firebase,
    // bạn có thể tạo link chính xác thông qua Admin SDK. Với bản SMTP thuần, ta gửi người
    // dùng đến trang reset, họ nhập email và hệ thống sẽ gọi Firebase `sendPasswordResetEmail` từ web.
    const resetLink = `${base}?email=${encodeURIComponent(email)}`;

    const html = renderResetEmail(resetLink);

    await transporter.sendMail({
      from: process.env.MAIL_FROM || `"NiNi Funny" <no-reply@nini-funny.com>`,
      to: email,
      subject: "Reset your password for NiNi-funny",
      html
    });

    return res.json({ message: "Mail reset đã được gửi (nếu email tồn tại)." });
  } catch (err) {
    console.error("send-reset error:", err);
    return res.status(500).json({ error: "Failed to send reset email" });
  }
});

// ===== Khởi động =====
const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
  console.log(`NiNi SMTP server listening on :${PORT}`);
});
