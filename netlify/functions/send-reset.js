[build]
  functions = "netlify/functions"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200
  force = true
// netlify/functions/send-reset.js
const nodemailer = require("nodemailer");

const CORS = {
  "Access-Control-Allow-Origin": "https://nini-funny.com",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

exports.handler = async (event) => {
  // Preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: CORS, body: "Method Not Allowed" };
  }

  try {
    const { email, link } = JSON.parse(event.body || "{}");
    if (!email) {
      return { statusCode: 400, headers: CORS, body: "Missing email" };
    }

    // SMTP config từ biến môi trường Netlify
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE).toLowerCase() === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    const from =
      `${process.env.FROM_NAME || "NiNi — Funny"} <${process.env.FROM_EMAIL}>`;

    await transporter.sendMail({
      from,
      to: email,
      subject: "Đặt lại mật khẩu NiNi — Funny",
      html: `
        <p>Xin chào,</p>
        <p>Nhấn vào liên kết để đặt lại mật khẩu:</p>
        <p><a href="${link || "https://nini-funny.com/#/home"}" target="_blank">
          ${link || "Mở liên kết"}</a></p>
        <p>Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
      `
    });

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ ok: true })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ ok: false, error: err.message })
    };
  }
};
