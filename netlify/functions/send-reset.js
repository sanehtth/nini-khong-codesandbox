const nodemailer = require('nodemailer');

const ORIGIN = process.env.CORS_ORIGIN || '*';
const corsHeaders = {
  'Access-Control-Allow-Origin': ORIGIN,
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

exports.handler = async (event) => {
  // Preflight CORS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders };
  }

  // Chỉ cho POST
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
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'email & link required' }) };
    }

    // Gmail SMTP (App Password)
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,            // smtp.gmail.com
      port: Number(process.env.SMTP_PORT || 465),
      secure: true,
      auth: {
        user: process.env.SMTP_USER,          // ví dụ: sane.hthh@gmail.com
        pass: process.env.SMTP_PASS,          // App Password 16 ký tự
      },
    });

    await transporter.sendMail({
      from: `"${process.env.FROM_NAME || 'NiNi Funny'}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
      to: email,
      subject: 'Đặt lại mật khẩu — NiNi Funny',
      text: `Nhấn vào link để đặt lại mật khẩu: ${link}`,
      html: `<p>Nhấn vào link để đặt lại mật khẩu:</p><p><a href="${link}">${link}</a></p>`,
    });

    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    return {
      statusCode: 502,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'send_mail_failed', detail: String(err) }),
    };
  }
};
