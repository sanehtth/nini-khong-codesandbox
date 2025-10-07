// netlify/functions/send-verification-email.js
const nodemailer = require("nodemailer");
const admin = require("firebase-admin");

const ALLOW_ORIGIN = process.env.CORS_ORIGIN || "https://nini-funny.com";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOW_ORIGIN,
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    }),
  });
}

exports.handler = async (event) => {
  // Preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  try {
    const { email } = JSON.parse(event.body || "{}");
    if (!email) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: "Missing email" }) };
    }

    // >>>>>>> QUAN TRỌNG: verify phải trỏ tới verify_email.html (KHÁC với reset) <<<<<<<
    const actionCodeSettings = {
      url: process.env.VERIFY_TARGET_URL || "https://nini-funny.com/verify_email.html",
      handleCodeInApp: true,
    };

    const link = await admin.auth().generateEmailVerificationLink(email, actionCodeSettings);

    // SMTP
    const host   = process.env.SMTP_HOST   || "smtp.gmail.com";
    const port   = Number(process.env.SMTP_PORT || 465);
    const secure = (process.env.SMTP_SECURE || "true") === "true";

    const transporter = nodemailer.createTransport({
      host, port, secure,
      auth: { user: process.env.SMTP_USER || process.env.SMTP_EMAIL, pass: process.env.SMTP_PASS },
    });

    const from    = process.env.FROM_EMAIL      || `"NiNi Funny" <${process.env.SMTP_EMAIL}>`;
    const subject = process.env.VERIFY_SUBJECT  || "Xác minh email — NiNi Funny";
    const html = `
      <p>Xin chào,</p>
      <p>Nhấn nút dưới đây để xác minh email cho tài khoản NiNi:</p>
      <p><a href="${link}" target="_blank" style="display:inline-block;padding:10px 14px;border-radius:8px;background:#2f6e3f;color:#fff;text-decoration:none">Xác minh email</a></p>
      <p>Nếu nút không bấm được, hãy copy liên kết sau:</p>
      <p><a href="${link}" target="_blank" rel="noopener">${link}</a></p>
    `;

    await transporter.sendMail({ from, to: email, subject, html });
    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ ok: true, message: "Verification email sent" }) };
  } catch (e) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: e.message }) };
  }
};
