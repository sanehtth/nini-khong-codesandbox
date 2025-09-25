// server.js — NiNi Funny (ESM)
// Yêu cầu: "type": "module" trong package.json

import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import admin from "firebase-admin";

dotenv.config();

// ===================================================================
// 1) ĐƯỜNG DẪN & HELPER
// ===================================================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function bool(v, def = false) {
  if (v === undefined || v === null) return def;
  const s = String(v).toLowerCase().trim();
  return ["1", "true", "yes", "on"].includes(s);
}

function log(...args) {
  console.log("[server]", ...args);
}

// ===================================================================
// 2) ENV BẮT BUỘC & TUỲ CHỌN
// ===================================================================
const PORT = Number(process.env.PORT || 3000);

// CORS: nguồn cho phép
const CORS_ORIGIN = process.env.CORS_ORIGIN || "https://nini-funny.com";

// Link trang client để xử lý reset (file reset-password.html)
// Ví dụ: https://nini-funny.com/reset-password.html
const RESET_TARGET_URL =
  process.env.RESET_TARGET_URL || "https://nini-funny.com/reset-password.html";

// SMTP (mail pro)
const SMTP_HOST = process.env.SMTP_HOST; // vd: mail9066.maychuemail.com
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = bool(process.env.SMTP_SECURE, false); // STARTTLS = false (587), SMTPS = true (465)
const SMTP_USER = process.env.SMTP_USER; // vd: no-reply@nini-funny.com
const SMTP_PASS = process.env.SMTP_PASS;
const MAIL_FROM =
  process.env.MAIL_FROM || `"NiNi Funny" <no-reply@nini-funny.com>`;

// Firebase Service Account — TÁCH BIẾN
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL;
const FIREBASE_PRIVATE_KEY_RAW = process.env.FIREBASE_PRIVATE_KEY || "";

// PRIVATE KEY nếu dán trong env dạng một dòng có \n -> chuyển về newline
const FIREBASE_PRIVATE_KEY = FIREBASE_PRIVATE_KEY_RAW.replace(/\\n/g, "\n");

// Kiểm tra tối thiểu
if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
  log("⚠️ Thiếu biến môi trường Firebase (FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY).");
}
if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
  log("⚠️ Thiếu biến môi trường SMTP (SMTP_HOST/USER/PASS).");
}

// ===================================================================
// 3) FIREBASE ADMIN
// ===================================================================
const serviceAccount = {
  type: "service_account",
  project_id: FIREBASE_PROJECT_ID,
  client_email: FIREBASE_CLIENT_EMAIL,
  private_key: FIREBASE_PRIVATE_KEY,
  token_uri: "https://oauth2.googleapis.com/token",
};

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  log("✅ Firebase Admin: OK");
} catch (e) {
  log("❌ Firebase Admin init lỗi:", e?.message || e);
}

// ===================================================================
// 4) SMTP TRANSPORTER (Nodemailer)
// ===================================================================
let transporter;
try {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  log("✅ SMTP transporter: OK");
} catch (e) {
  log("❌ SMTP transporter lỗi:", e?.message || e);
}

// ===================================================================
// 5) APP EXPRESS
// ===================================================================
const app = express();
app.use(express.json());
app.use(
  cors({
    origin: CORS_ORIGIN,
    credentials: false,
  })
);

// Healthcheck
app.get("/api/ping", (req, res) => {
  res.json({ ok: true, time: Date.now() });
});

app.get("/api/version", (req, res) => {
  res.json({ name: "nini-funny-server", version: "1.0.0" });
});

// ===================================================================
// 6) LOAD TEMPLATE EMAIL (nếu có)
//    file: ./email_reset_template.html
//    placeholder: {{resetLink}}  {{email}}
// ===================================================================
let baseTemplate = "";
const tplPath = path.resolve(__dirname, "email_reset_template.html");
try {
  baseTemplate = fs.readFileSync(tplPath, "utf8");
  log("✅ Đã đọc template email_reset_template.html");
} catch {
  log("ℹ️ Không tìm thấy template, dùng fallback HTML.");
  baseTemplate = `
    <div style="font-family:system-ui,Arial,sans-serif">
      <h2>Đặt lại mật khẩu NiNi–Funny</h2>
      <p>Xin chào {{email}},</p>
      <p>Nhấn vào liên kết bên dưới để đặt lại mật khẩu:</p>
      <p><a href="{{resetLink}}" target="_blank" rel="noopener">{{resetLink}}</a></p>
      <p>Nếu bạn không yêu cầu thao tác này, vui lòng bỏ qua email.</p>
      <hr/>
      <small>NiNi — Funny Team</small>
    </div>
  `;
}

function renderResetMail(resetLink, email) {
  return baseTemplate
    .replaceAll("{{resetLink}}", resetLink)
    .replaceAll("{{email}}", email);
}

// ===================================================================
// 7) API: Gửi email reset password
//    Body: { "email": "user@example.com" }
// ===================================================================
app.post("/api/send-reset", async (req, res) => {
  const email = (req.body?.email || "").trim().toLowerCase();

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ ok: false, message: "Email không hợp lệ." });
  }

  // 7.1 Tạo actionCodeSettings cho link reset
  const actionCodeSettings = {
    url: RESET_TARGET_URL, // trang client sẽ xử lý oobCode
    handleCodeInApp: false,
  };

  try {
    // 7.2 Tạo reset link từ Firebase
    const resetLink = await admin
      .auth()
      .generatePasswordResetLink(email, actionCodeSettings);

    // 7.3 Gửi email qua SMTP mail pro
    const htmlBody = renderResetMail(resetLink, email);

    await transporter.sendMail({
      from: MAIL_FROM,
      to: email,
      subject: "Reset your password for NiNi–funny",
      html: htmlBody,
    });

    log(`📧 Đã gửi mail reset cho: ${email}`);
    return res.json({
      ok: true,
      message:
        "Nếu email tồn tại, hệ thống đã gửi hướng dẫn đặt lại mật khẩu.",
    });
  } catch (err) {
    const msg = err?.message || String(err);
    log("❌ Gửi email reset lỗi:", msg);
    // Ẩn lỗi nhạy cảm với client
    return res.status(500).json({
      ok: false,
      message:
        "Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại hoặc liên hệ hỗ trợ.",
    });
  }
});

// ===================================================================
// 8) KHỞI ĐỘNG SERVER
// ===================================================================
app.listen(PORT, () => {
  log(`🚀 Server đang chạy ở cổng ${PORT}`);
  log(`   CORS_ORIGIN: ${CORS_ORIGIN}`);
  log(`   RESET_TARGET_URL: ${RESET_TARGET_URL}`);
});
