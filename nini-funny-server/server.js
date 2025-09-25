import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

const {
  PORT = 3000,
  SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, MAIL_FROM,
  RESET_TARGET_URL, CORS_ORIGIN
} = process.env;

// === Firebase Admin ===
admin.initializeApp({
  credential: admin.credential.cert(
    JSON.parse(fs.readFileSync(path.resolve("serviceAccountKey.json"), "utf8"))
  ),
});

// === SMTP transporter ===
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT || 587),
  secure: String(SMTP_SECURE).toLowerCase() === "true",
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

// === App ===
const app = express();
app.use(express.json());
app.use(cors({ origin: CORS_ORIGIN, credentials: false }));

// Load template HTML (có placeholder {{resetLink}} {{email}})
const templatePath = path.resolve("email_reset_template.html");
const baseTemplate = fs.readFileSync(templatePath, "utf8");

// Helper render
function renderResetEmail({ resetLink, email }) {
  return baseTemplate
    .replaceAll("{{resetLink}}", resetLink)
    .replaceAll("{{email}}", email);
}

/**
 * POST /api/send-reset
 * body: { email: string }
 */
app.post("/api/send-reset", async (req, res) => {
  const { email } = req.body || {};
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ error: "Email không hợp lệ" });
  }

  try {
    // Tạo reset-link có hạn bởi Firebase
    const actionCodeSettings = {
      url: RESET_TARGET_URL,   // trang sẽ xử lý oobCode
      handleCodeInApp: false,
    };
    const resetLink = await admin.auth().generatePasswordResetLink(email, actionCodeSettings);

    // Gửi mail HTML đẹp từ no-reply@...
    const html = renderResetEmail({ resetLink, email });

    await transporter.sendMail({
      from: MAIL_FROM,
      to: email,
      subject: "Đặt lại mật khẩu — NiNi Funny",
      html,
    });

    // trả về OK
    return res.json({ ok: true });
  } catch (e) {
    console.error("[send-reset] error:", e);
    // Không tiết lộ quá nhiều thông tin (tránh lộ tồn tại email)
    return res.status(200).json({ ok: true });
  }
});

app.listen(PORT, () => console.log(`✔ Reset mail server running on :${PORT}`));
