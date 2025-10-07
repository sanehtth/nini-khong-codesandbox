// netlify/functions/send-reset.js
const nodemailer = require('nodemailer');
const admin = require('firebase-admin');

const ALLOW_ORIGIN = process.env.CORS_ORIGIN || 'https://nini-funny.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOW_ORIGIN,
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization'
};

// Init Firebase Admin (dùng service account từ ENV)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
}

exports.handler = async (event) => {
  // Preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders };
  }
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const { email } = JSON.parse(event.body || '{}');
    if (!email) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing email' })
      };
    }

    // Tạo link reset có oobCode
    const actionCodeSettings = {
      url: process.env.RESET_TARGET_URL, // vd: https://nini-funny.com/reset-password.html
      handleCodeInApp: true,
    };
    const link = await admin.auth().generatePasswordResetLink(email, actionCodeSettings);

    // SMTP (Gmail/Yahoo/Custom)
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT || 465);
    const secure = (process.env.SMTP_SECURE || 'true') === 'true';

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user: process.env.SMTP_USER || process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASS,
      },
    });

    const from = process.env.FROM_EMAIL || `"NiNi Funny" <${process.env.SMTP_EMAIL}>`;
    const subject = process.env.RESET_SUBJECT || 'Đặt lại mật khẩu NiNi';

    const html = `
      <p>Xin chào,</p>
      <p>Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản NiNi.</p>
      <p>Nhấn vào liên kết sau để đặt lại mật khẩu:</p>
      <p><a href="${link}" target="_blank" rel="noopener">${link}</a></p>
      <p>Nếu bạn không yêu cầu thao tác này, vui lòng bỏ qua email.</p>
    `;

    // (giữ nguyên logic của bạn, chỉ thêm message khi OK/ERR)

await transporter.sendMail({ from, to: email, subject, html });
return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ ok: true, message: "Đã gửi link đặt lại mật khẩu" }) };
  } catch (e) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: e.message })
    };
  }
};

