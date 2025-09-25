// =========================
// NiNi — Funny: Mail server
// =========================

import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

// ------- ENV -------
const {
  PORT = 3000,
  CORS_ORIGIN = "https://nini-funny.com",

  // SMTP (mail pro của domain)
  SMTP_HOST,
  SMTP_PORT = 587,
  SMTP_SECURE = "false",
  SMTP_USER,
  SMTP_PASS,
  MAIL_FROM, // ví dụ: "NiNi Funny <no-reply@nini-funny.com>"

  // URL trang reset trên client
  RESET_TARGET_URL = "https://nini-funny.com/reset-password.html",
} = process.env;

// ------- Firebase Admin -------
/**
 * Đảm bảo có file serviceAccountKey.json trong cùng thư mục.
 * Tải từ Firebase Console > Project Settings > Service accounts.
 */
const serviceKeyPath = path.resolve("serviceAccountKey.json");
if (!fs.existsSync(serviceKeyPath)) {
  console.error("[FATAL] Thiếu serviceAccountKey.json trong nini-funny-server/");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(
    JSON.parse(fs.readFileSync(serviceKeyPath, "utf8"))
  ),
});

// ------- SMTP transporter (BẮT BUỘC gửi bằng mail pro) -------
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  secure: String(SMTP_SECURE).toLowerCase() === "true",
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

// ------- Express app -------
const app = express();
app.use(express.json());

// CORS: chỉ cho web app gọi (có thể mở rộng nếu bạn cần)
app.use(
  cors({
    origin: CORS_ORIGIN,
    credentials: false,
  })
);

// ------- Load template mail (HTML có {{resetLink}} & {{email}}) -------
const templatePath = path.resolve("email_reset_template.html");
const baseTemplate = fs.readFileSync(templatePath, "utf8");

function renderResetEmail(resetLink, email) {
  return baseTemplate
    .replaceAll("{{resetLink}}", resetLink)
    .replaceAll("{{email}}", email);
}

// =======================================
// POST /api/auth/forgot  (quên mật khẩu)
// body: { email }
// =======================================
app.post("/api/auth/forgot", async (req, res) => {
  const email = (req.body?.email || "").trim();

  // validate email rất cơ bản
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: "Email không hợp lệ" });
  }

  try {
    // 1) Tạo action link reset bằng Firebase Admin
    const settings = {
      url: RESET_TARGET_URL, // client sẽ xử lý oobCode ở trang này
      handleCodeInApp: false,
    };
    const actionLink = await admin
      .auth()
      .generatePasswordResetLink(email, settings);

    // 2) Render template mail
    const htmlBody = renderResetEmail(actionLink, email);

    // 3) Gửi email bằng mail pro (from = no-reply@...)
    await transporter.sendMail({
      from: MAIL_FROM, // BẮT BUỘC phải là no-reply@nini-funny.com
      to: email,
      subject: "Reset your password for NiNi-funny",
      html: htmlBody,
    });

    return res.json({
      ok: true,
      message: "Nếu email tồn tại, hệ thống đã gửi hướng dẫn đặt lại mật khẩu.",
    });
  } catch (err) {
    console.error("[forgot] error:", err);
    return res
      .status(500)
      .json({ message: "Không gửi được email. Vui lòng thử lại sau." });
  }
});

// ------- Health check -------
app.get("/health", (_req, res) => res.json({ ok: true }));

// ------- Start -------
app.listen(Number(PORT), () => {
  console.log(`[NiNi-mail] running on :${PORT}`);
  console.log(`CORS_ORIGIN = ${CORS_ORIGIN}`);
  console.log(`SMTP_USER   = ${SMTP_USER}`);
});
