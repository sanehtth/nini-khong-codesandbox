// netlify/functions/send-reset.js
const nodemailer = require('nodemailer');

const ALLOW_ORIGIN = process.env.CORS_ORIGIN || 'https://nini-funny.com/reset-password.html'; // đổi nếu cần

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOW_ORIGIN,
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

exports.handler = async (event) => {
  // Preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders };
  }

  // Sai method
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const { email, link } = JSON.parse(event.body || '{}');
    if (!email || !link) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing email or link' }),
      };
    }

    // Chọn SMTP theo biến môi trường đã set (Gmail hoặc Yahoo)
    // Gmail: host smtp.gmail.com, port 465, secure true
    // Yahoo: host smtp.mail.yahoo.com, port 465, secure true
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT || 465);
    const secure = String(process.env.SMTP_SECURE || 'true') === 'true';

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user: process.env.SMTP_USER, // ví dụ: sane.htth@gmail.com
        pass: process.env.SMTP_PASS, // App Password
      },
    });

    const from = process.env.FROM_EMAIL || process.env.SMTP_USER; // tên/địa chỉ gửi
    const subject = process.env.RESET_SUBJECT || 'Đặt lại mật khẩu NiNi';
    const html = `
      <p>Xin chào,</p>
      <p>Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản NiNi.</p>
      <p>Nhấn vào liên kết sau để đặt lại mật khẩu:</p>
      <p><a href="${link}" target="_blank" rel="noopener">${link}</a></p>
      <p>Nếu bạn không yêu cầu thao tác này, vui lòng bỏ qua email.</p>
    `;

    await transporter.sendMail({
      from,
      to: email,
      subject,
      html,
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ ok: true }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: err.message || 'Internal Error' }),
    };
  }
};

