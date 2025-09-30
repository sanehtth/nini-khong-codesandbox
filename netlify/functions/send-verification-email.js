/**
 * netlify/functions/send-verify.js
 *
 * Nhận { email } từ client → tạo link VERIFY (mode=verifyEmail) bằng Firebase Admin
 * → gửi mail xác minh qua SMTP (mail pro của bạn).
 *
 * YÊU CẦU ENV (đặt trong Netlify > Site settings > Environment variables):
 *  - FIREBASE_PROJECT_ID
 *  - FIREBASE_CLIENT_EMAIL
 *  - FIREBASE_PRIVATE_KEY        (copy từ service account, nhớ escape newline thành \n)
 *  - VERIFY_EMAIL_TARGET_URL     (vd: https://nini-funny.com/verify-email.html)
 *
 *  - SMTP_HOST
 *  - SMTP_PORT                   (ví dụ 587)
 *  - SMTP_SECURE                 ("true" | "false")
 *  - SMTP_USER                   (username, hoặc dùng SMTP_EMAIL)
 *  - SMTP_PASS
 *  - SMTP_EMAIL                  (địa chỉ from mặc định nếu FROM_EMAIL không có)
 *
 *  - FROM_EMAIL                  (ví dụ: "NiNi Funny <no-reply@nini-funny.com>")
 *  - CORS_ORIGIN                 (vd: https://nini-funny.com)
 */

const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

const ALLOW_ORIGIN = process.env.CORS_ORIGIN || "https://nini-funny.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOW_ORIGIN,
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
};

// Init Firebase Admin một lần
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    }),
  });
}

exports.handler = async (event) => {
  // Preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders };
  }
  // Chỉ cho POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    const { email, subject, htmlIntro } = JSON.parse(event.body || "{}");
    if (!email) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Missing email" }),
      };
    }

    // 1) Tạo link VERIFY (đúng flow xác minh email)
    const verifyUrl =
      process.env.VERIFY_EMAIL_TARGET_URL || "https://nini-funny.com/verify-email.html";
    const actionCodeSettings = {
      url: verifyUrl,
      handleCodeInApp: true,
    };
    const link = await admin
      .auth()
      .generateEmailVerificationLink(email, actionCodeSettings);

    // 2) Cấu hình SMTP transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: (process.env.SMTP_SECURE || "false").toLowerCase() === "true",
      auth: {
        user: process.env.SMTP_USER || process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASS,
      },
    });

    // 3) Tạo nội dung email
    const from = process.env.FROM_EMAIL || `"NiNi Funny" <${process.env.SMTP_EMAIL}>`;
    const mailSubject = subject || "Xác minh email NiNi — Funny";

    const htmlBody =
      htmlIntro ||
      `
      <p>Xin chào,</p>
      <p>Vui lòng bấm vào liên kết dưới đây để xác minh email cho tài khoản NiNi — Funny:</p>
      <p><a href="${link}" target="_blank" rel="noopener">${link}</a></p>
      <p>Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
      `;

    // 4) Gửi mail
    await transporter.sendMail({
      from,
      to: email,
      subject: mailSubject,
      html: htmlBody,
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ ok: true }),
    };
  } catch (e) {
    console.error("[send-verify] error:", e);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: e.message || "send-verify failed" }),
    };
  }
};
