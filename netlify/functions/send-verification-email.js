// ================================
// BEGIN: send-verification-email.js
// ================================
const nodemailer = require("nodemailer");
const admin = require("firebase-admin");

const ALLOW_ORIGIN = process.env.CORS_ORIGIN || "https://nini-funny.com";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOW_ORIGIN,
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization"
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    }),
  });
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: corsHeaders };
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ message: "Method Not Allowed" }) };
  }

  try{
    const { email } = JSON.parse(event.body || "{}");
    if (!email) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ message:"Missing email" }) };
    }

    // TẠO LINK XÁC MINH ĐÚNG CHUẨN
    const verifySettings = {
      url: process.env.VERIFY_CONTINUE_URL || "https://nini-funny.com/#/home",
      handleCodeInApp: true,
    };
    const link = await admin.auth().generateEmailVerificationLink(email, verifySettings);

    // SMTP
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT || 465),
      secure: (process.env.SMTP_SECURE || "true") === "true",
      auth: {
        user: process.env.SMTP_USER || process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASS,
      },
    });

    const from = process.env.FROM_EMAIL || `"NiNi Funny" <${process.env.SMTP_EMAIL}>`;
    const subject = process.env.VERIFY_SUBJECT || "Xác minh email NiNi — Funny";
    const html = `
      <p>Xin chào,</p>
      <p>Nhấn vào nút bên dưới để <b>xác minh email</b> cho tài khoản NiNi:</p>
      <p><a href="${link}" target="_blank" rel="noopener" style="padding:10px 14px;border-radius:8px;background:#2f6e3f;color:#fff;text-decoration:none;">Xác minh email</a></p>
      <p>Nếu không bấm được nút, hãy copy liên kết sau vào trình duyệt:</p>
      <p><a href="${link}" target="_blank" rel="noopener">${link}</a></p>
    `;

    await transporter.sendMail({ from, to: email, subject, html });

    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ ok:true, message:"Đã gửi email xác minh" }) };
  }catch(e){
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ message: e.message }) };
  }
};
// ================================
// END: send-verification-email.js
// ================================
