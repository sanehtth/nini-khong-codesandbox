// server.js
import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ===== Utils path =====
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ====== ENV ======
const PORT               = process.env.PORT || 3000;

// SMTP
const SMTP_HOST          = process.env.SMTP_HOST;           // vd: mail9066.maychuemail.com
const SMTP_PORT          = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE        = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";
const SMTP_USER          = process.env.SMTP_USER;           // no-reply@nini-funny.com
const SMTP_PASS          = process.env.SMTP_PASS;

// FROM
const FROM_EMAIL         = process.env.FROM_EMAIL || SMTP_USER;
const FROM_NAME          = process.env.FROM_NAME  || "NiNi Funny";

// Client URL để reset
const APP_PUBLIC_URL     = process.env.APP_PUBLIC_URL || "https://nini-funny.com";
const RESET_TARGET_URL   = `${APP_PUBLIC_URL}/reset-password.html`;

// CORS whitelist (phân tách bởi dấu phẩy)
const CORS_ORIGIN        = (process.env.CORS_ORIGIN || "https://nini-funny.com")
  .split(",").map(s=>s.trim()).filter(Boolean);

// Firebase Service Account (qua biến môi trường)
const FIREBASE_PROJECT_ID   = process.env.FIREBASE_PROJECT_ID;
const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL;
let   FIREBASE_PRIVATE_KEY  = process.env.FIREBASE_PRIVATE_KEY;

// Chuẩn hóa private key (Render/Netlify thường lưu “\n” dạng chuỗi)
if (FIREBASE_PRIVATE_KEY && FIREBASE_PRIVATE_KEY.includes("\\n")) {
  FIREBASE_PRIVATE_KEY = FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n");
}

// ====== Firebase Admin init ======
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: FIREBASE_PRIVATE_KEY,
    }),
  });
}

// ====== SMTP transporter ======
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

// ====== Express app ======
const app = express();
app.use(express.json());

// CORS
app.use(cors({
  origin(origin, cb){
    if (!origin) return cb(null, true);
    if (CORS_ORIGIN.includes(origin)) return cb(null, true);
    return cb(new Error("CORS not allowed"), false);
  },
  methods: ["GET","POST","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"],
  credentials: true
}));

// ====== Template email đơn giản ======
const templatePath = path.resolve(__dirname, "email_reset_template.html");
const resetTpl = fs.existsSync(templatePath)
  ? fs.readFileSync(templatePath, "utf8")
  : `<!doctype html><html><body style="font-family:system-ui">
      <h2>Đặt lại mật khẩu NiNi — Funny</h2>
      <p>Chào bạn,</p>
      <p>Bấm vào liên kết sau để đặt lại mật khẩu:</p>
      <p><a href="{{link}}" target="_blank">{{link}}</a></p>
      <p>Nếu không phải bạn thực hiện, có thể bỏ qua email này.</p>
      <p>— {{brand}}</p>
    </body></html>`;

function renderReset(link) {
  return resetTpl
    .replaceAll("{{link}}", link)
    .replaceAll("{{brand}}", FROM_NAME);
}

// ====== Routes ======
app.get("/api/ping", (req, res) => {
  res.json({ ok: true, time: Date.now() });
});

app.post("/api/send-reset", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
      return res.status(400).json({ message: "Email không hợp lệ" });
    }

    // Tạo link reset từ Firebase
    const actionCodeSettings = {
      url: `${RESET_TARGET_URL}`,
      handleCodeInApp: false
    };
    const resetLink = await admin.auth().generatePasswordResetLink(email, actionCodeSettings);

    // Gửi mail qua SMTP pro (hiển thị từ no-reply@domain)
    const html = renderReset(resetLink);
    await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: email,
      subject: "Đặt lại mật khẩu NiNi — Funny",
      html
    });

    return res.json({ message: "Đã gửi email đặt lại mật khẩu (nếu email tồn tại)." });
  } catch (e) {
    console.error("send-reset error:", e);
    return res.status(500).json({ message: "Không gửi được email. Kiểm tra cấu hình server." });
  }
});

// ====== Start ======
app.listen(PORT, () => {
  console.log(`NiNi server is running on :${PORT}`);
  console.log("CORS allow:", CORS_ORIGIN);
});
