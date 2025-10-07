// netlify/functions/send-reset.js
const nodemailer = require('nodemailer');
const admin = require('firebase-admin');

const ALLOW_ORIGIN = process.env.CORS_ORIGIN || 'https://nini-funny.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOW_ORIGIN,
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

// Init Firebase Admin (service account từ ENV)
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
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders };
  }
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const { email } = JSON.parse(event.body || '{}');
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing email' }),
      };
    }

    // Link reset: dùng ENV nếu có, mặc định qua auth-action.html
    const actionCodeSettings = {
      url: process.env.RESET_TARGET_URL || 'https://nini-funny.com/auth-action.html',
      handleCodeInApp: true,
    };
    const link = await admin.auth().generatePasswordResetLink(cleanEmail, actionCodeSettings);

    // SMTP mail pro
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,                       // ví dụ: mail.yourdomain.com
      port: Number(process.env.SMTP_PORT || 465),
      secure: (process.env.SMTP_SECURE || 'true') === 'true',
      auth: {
        user: process.env.SMTP_USER || process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASS,
      },
    });

    const from = process.env.FROM_EMAIL || `"NiNi Funny" <${process.env.SMTP_EMAIL}>`;
    const subject = process.env.RESET_SUBJECT || 'Đặt lại mật khẩu NiNi';

    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.6;color:#111">
        <h2>Đặt lại mật khẩu NiNi</h2>
        <p>Xin chào,</p>
        <p>Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản NiNi.</p>
        <p style="margin:20px 0">
          <a href="${link}" style="display:inline-block;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:8px">
            Đặt lại mật khẩu
          </a>
        </p>
        <p>Nếu nút không bấm được, copy link sau và mở trong trình duyệt:</p>
        <p style="word-break:break-all"><a href="${link}">${link}</a></p>
        <hr style="margin:24px 0;border:none;border-top:1px solid #eee">
        <p style="color:#666;font-size:12px">Nếu bạn không yêu cầu thao tác này, hãy bỏ qua email.</p>
      </div>
    `;

    await transporter.sendMail({
      from,
      to: cleanEmail,
      subject,
      html,
    });

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true }),
    };
  } catch (e) {
    // Nếu muốn tránh enumerate user, có thể coi 'user-not-found' là ok:
    // if (e?.code === 'auth/user-not-found') {
    //   return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ ok: true }) };
    // }

    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: e.message }),
    };
  }
};
