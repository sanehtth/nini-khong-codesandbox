/** -----------------------------------------------
 *  FILE: netlify/functions/send-verification-email.js
 *  PURPOSE: Gửi email xác minh (verify email) qua SMTP riêng
 *  RÀNG BUỘC MÔI TRƯỜNG (Netlify → Environment variables):
 *   - FIREBASE_PROJECT_ID
 *   - FIREBASE_CLIENT_EMAIL
 *   - FIREBASE_PRIVATE_KEY        (nhớ escape newline -> \n)
 *   - VERIFY_EMAIL_TARGET_URL     (vd: https://nini-funny.com/verify-email.html)
 *   - SMTP_HOST / SMTP_PORT / SMTP_SECURE ("true"|"false")
 *   - SMTP_USER / SMTP_PASS
 *   - FROM_EMAIL       (vd: "NiNi Funny" <no-reply@nini-funny.com>)
 *   - CORS_ORIGIN      (vd: https://nini-funny.com)
 * ------------------------------------------------ */

const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

// ===== CORS =====
const ALLOW_ORIGIN = process.env.CORS_ORIGIN || "https://nini-funny.com";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOW_ORIGIN,
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
};

// ===== Firebase Admin (service account từ ENV) =====
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    }),
  });
}

// ===== SMTP transporter =====
function makeTransporter() {
  const host   = process.env.SMTP_HOST;
  const port   = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";

  if (!host || !process.env.SMTP_PASS || !(process.env.SMTP_USER || process.env.FROM_EMAIL)) {
    throw new Error("SMTP env not configured");
  }
  return nodemailer.createTransport({
    host, port, secure,
    auth: {
      user: process.env.SMTP_USER || process.env.FROM_EMAIL,
      pass: process.env.SMTP_PASS,
    },
  });
}

// ===== HTML template email =====
function renderHtml({ to, link }) {
  return /* html */ `
  <div style="font:15px/1.6 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1b2b21">
    <h2 style="margin:0 0 8px">Xác minh email cho <span style="color:#2f6e3f">NiNi — Funny</span></h2>
    <p>Xin chào <b>${to}</b>,</p>
    <p>Nhấn nút bên dưới để xác minh địa chỉ email của bạn:</p>
    <p style="margin:20px 0">
      <a href="${link}" target="_blank" rel="noopener"
         style="display:inline-block;background:#2f6e3f;color:#fff;text-decoration:none;
                padding:12px 18px;border-radius:10px;box-shadow:0 6px 16px rgba(47,110,63,.25)">
        Xác minh email
      </a>
    </p>
    <p>Nếu nút không bấm được, hãy copy liên kết sau và mở trong trình duyệt:</p>
    <p style="word-break:break-all"><a href="${link}" target="_blank">${link}</a></p>
    <hr style="border:none;height:1px;background:#e6efe8;margin:24px 0">
    <p style="color:#54705f">Nếu bạn không yêu cầu thao tác này, hãy bỏ qua email.</p>
    <p>— NiNi-Funny Team</p>
  </div>`;
}

// ===== Handler =====
exports.handler = async (event) => {
  // OPTIONS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ ok:false, error:"Method Not Allowed" }) };
  }

  try {
    const { email, continueUrl } = JSON.parse(event.body || "{}");
    if (!email) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ ok:false, error:"Missing email" }) };
    }

    // Tạo verify-link bằng Firebase Admin
    const targetUrl = process.env.VERIFY_EMAIL_TARGET_URL || "https://nini-funny.com/verify-email.html";
    const actionCodeSettings = {
      url: continueUrl || targetUrl,
      handleCodeInApp: true,
    };
    const link = await admin.auth().generateEmailVerificationLink(email, actionCodeSettings);

    // Gửi qua SMTP
    const transporter = makeTransporter();
    const from = process.env.FROM_EMAIL || "NiNi Funny <no-reply@nini-funny.com>";
    const subject = "Xác minh địa chỉ email của bạn — NiNi Funny";
    const html = renderHtml({ to: email, link });

    await transporter.sendMail({ from, to: email, subject, html });

    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ ok:true, message: "Verification email sent" }) };
  } catch (e) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ ok:false, error: e.message || "send-verification failed" }) };
  }
};
