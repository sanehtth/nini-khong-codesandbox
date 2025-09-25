import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app = express();
app.use(express.json());

// ===== CORS =====
const ALLOWED = (process.env.CORS_ORIGIN || "").split(",").map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    // cho phép khi không có Origin (curl/health-check) hoặc origin khớp danh sách
    if (!origin || ALLOWED.includes(origin)) return cb(null, true);
    cb(new Error("CORS blocked"));
  }
}));

// ===== Nodemailer (SMTP pro) =====
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,                       // vd: mail9066.maychuemail.com
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE || "false").toLowerCase() === "true",
  auth: {
    user: process.env.SMTP_USER,                     // no-reply@nini-funny.com
    pass: process.env.SMTP_PASS
  }
});

// ===== Template email =====
const templatePath = path.resolve(__dirname, "email_reset_template.html");
const baseTemplate = fs.readFileSync(templatePath, "utf8");
const renderResetMail = (resetLink, email) =>
  baseTemplate.replaceAll("{{resetLink}}", resetLink).replaceAll("{{email}}", email);

// ===== Routes =====

// Health check
app.get("/api/ping", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// Gửi mail reset (server tạo link Firebase & gửi bằng mail pro)
app.post("/api/send-reset", async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Email không hợp lệ" });
    }

    // Link reset (client page reset-password.html của bạn)
    // Nếu bạn đã dùng Firebase sendPasswordResetEmail ở client thì có thể
    // pass thẳng oobCode. Ở bản server-only, ta tạo link kiểu “điền email xong
    // vào page reset, server chỉ gửi mail với link này”.
    const resetLink = `${process.env.RESET_TARGET_URL}?email=${encodeURIComponent(email)}`;

    const htmlBody = renderResetMail(resetLink, email);

    await transporter.sendMail({
      from: process.env.MAIL_FROM,                  // "NiNi Funny <no-reply@nini-funny.com>"
      to: email,
      subject: "Reset your password for NiNi-funny",
      html: htmlBody
    });

    return res.json({ message: "Đã gửi email đặt lại mật khẩu (SMTP pro)." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Gửi mail thất bại." });
  }
});

// Root
app.get("/", (req, res) => {
  res.type("text/plain").send("NiNi-funny SMTP server is running. Try GET /api/ping");
});

// Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server up on :${PORT}`));
