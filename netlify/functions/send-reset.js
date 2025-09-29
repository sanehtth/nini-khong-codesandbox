// netlify/functions/send-reset.js
const nodemailer = require("nodemailer");

// CORS
const ALLOW_ORIGIN = process.env.CORS_ORIGIN || "https://nini-funny.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOW_ORIGIN,
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization"
};

exports.handler = async (event) => {
  // Preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }

  try {
    const { email, link } = JSON.parse(event.body || "{}");
    if (!email || !link) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Missing email or link" })
      };
    }

    // ==== SMTP từ biến môi trường Netlify ====
    // Gmail: host smtp.gmail.com / port 465 / secure true
    // Yahoo: host smtp.mail.yahoo.com / port 465 / secure true
    const host = process.env.SMTP_HOST || "smtp.gmail.com";
    const port = Number(process.env.SMTP_PORT || 465);
    const secure = String(process.env.SMTP_SECURE || "true") === "true";

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user: process.env.SMTP_USER,   // tài khoản SMTP
        pass: process.env.SMTP_PASS    // app password
      }
    });

    const from = process.env.FROM_USER || "NiNi Funny <no-reply@nini-funny.com>";
    const subject = process.env.RESET_SUBJECT || "Đặt lại mật khẩu NiNi";
    const resetTarget = process.env.RESET_TARGET_URL || "https://nini-funny.com/reset-password.html";

    // Nếu bạn muốn buộc link về trang reset của bạn (giữ nguyên oobCode ở frontend)
    const html = `
      <p>Xin chào,</p>
      <p>Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản NiNi.</p>
      <p>Nhấn vào liên kết sau để đặt lại mật khẩu:</p>
      <p><a href="${resetTarget}" target="_blank" rel="noopener">${link}</a></p>
      <p>Nếu bạn không yêu cầu thao tác này, vui lòng bỏ qua email.</p>
    `;

    await transporter.sendMail({
      from,
      to: email,
      subject,
      html
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ ok: true })
    };
  } catch (e) {
    // Log lỗi ra Netlify Functions Logs
    console.error(e);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Internal Server Error" })
    };
  }
};
