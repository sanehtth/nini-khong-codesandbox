/* eslint-disable no-console */
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import admin from "firebase-admin";
import { fileURLToPath } from "url";

dotenv.config();

// ===== Paths helpers (ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== App
const app = express();
app.set("trust proxy", true);

// ===== CORS (đặt TRƯỚC mọi route)
const ALLOW = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

const corsOpts = {
  origin(origin, cb) {
    // cho phép tool/cURL (origin null) và các origin trong whitelist
    if (!origin || ALLOW.includes(origin)) return cb(null, true);
    return cb(new Error("Not allowed by CORS: " + origin));
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Accept"],
  credentials: false,
};
app.use(cors(corsOpts));
app.options("*", cors(corsOpts)); // quan trọng cho preflight

// ===== Body parser
app.use(express.json());

// ===== Firebase Admin init (Service Account từ ENV)
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL;
let FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY || "";

// Render/Netlify có thể lưu key 1 dòng -> khôi phục xuống dòng
if (FIREBASE_PRIVATE_KEY && FIREBASE_PRIVATE_KEY.includes("\\n")) {
  FIREBASE_PRIVATE_KEY = FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n");
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: FIREBASE_PRIVATE_KEY,
    }),
  });
  console.log("[Firebase] Admin initialized");
}

// ===== SMTP transporter (mail pro)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE || "false").toLowerCase() === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ===== Template (tuỳ chọn)
const templatePath = path.resolve(__dirname, "email_reset_template.html");
const hasTemplate = fs.existsSync(templatePath);
let templateHtml = "";
if (hasTemplate) {
  templateHtml = fs.readFileSync(templatePath, "utf8");
  console.log("[Template] email_reset_template.html loaded");
}

function renderTemplate(resetLink, email) {
  if (!hasTemplate) {
    // fallback đơn giản
    return `
      <p>Xin chào,</p>
      <p>Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản <strong>${email}</strong>.</p>
      <p>Nhấn vào liên kết sau để đặt lại mật khẩu:</p>
      <p><a href="${resetLink}" target="_blank" rel="noopener">${resetLink}</a></p>
      <p>Nếu không phải bạn, vui lòng bỏ qua email này.</p>
      <p>— NiNi Funny</p>
    `;
  }
  return templateHtml
    .replaceAll("{{resetLink}}", resetLink)
    .replaceAll("{{email}}", email);
}

// ===== Helpers
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

function bad(res, msg = "Bad request", code = 400) {
  return res.status(code).json({ ok: false, message: msg });
}

// ===== Routes
app.get("/api/ping", (_, res) => res.type("text").send("ok"));

/**
 * POST /api/send-reset
 * body: { email }
 * - Generate password reset link (Firebase)
 * - Gửi email qua SMTP
 */
app.post("/api/send-reset", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim();
    if (!EMAIL_RE.test(email)) return bad(res, "Email không hợp lệ");

    // Action Code Settings: nơi người dùng sẽ được điều hướng để đặt mật khẩu
    const RESET_TARGET_URL =
      process.env.RESET_TARGET_URL ||
      "https://nini-funny.com/reset-password.html";

    const actionCodeSettings = {
      url: RESET_TARGET_URL,
      handleCodeInApp: false,
    };

    // 1) Firebase tạo link reset
    const resetLink = await admin
      .auth()
      .generatePasswordResetLink(email, actionCodeSettings);

    // 2) Render HTML
    const htmlBody = renderTemplate(resetLink, email);

    // 3) Gửi mail bằng SMTP pro
    const fromAddr = process.env.MAIL_FROM || "no-reply@nini-funny.com";
    await transporter.sendMail({
      from: fromAddr, // bắt buộc là no-reply@ domain của bạn
      to: email,
      subject: "Reset your password for NiNi-funny",
      html: htmlBody,
    });

    return res.json({
      ok: true,
      message:
        "Nếu email tồn tại, hệ thống đã gửi đường dẫn đặt lại mật khẩu.",
    });
  } catch (e) {
    console.error("[/api/send-reset] error:", e);
    return res
      .status(500)
      .json({ ok: false, message: "Không thể gửi email. Vui lòng thử lại." });
  }
});

// ===== Start
const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
  console.log(`[Server] listening on :${PORT}`);
  console.log(
    "[CORS_ORIGIN]",
    ALLOW.length ? ALLOW.join(", ") : "(not set – only server/cURL allowed)"
  );
});
