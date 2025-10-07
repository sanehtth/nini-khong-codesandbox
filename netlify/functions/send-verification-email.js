// netlify/functions/send-verification-email.js
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

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
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204 };
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const { email } = JSON.parse(event.body || '{}');
    if (!email) return { statusCode: 400, body: 'Missing email' };

    // Link trỏ thẳng tới trang custom
    const link = await admin.auth().generateEmailVerificationLink(email, {
      url: 'https://nini-funny.com/auth-action.html',
      handleCodeInApp: true,
    });

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 465),
      secure: (process.env.SMTP_SECURE || 'true') === 'true',
      auth: { user: process.env.SMTP_USER || process.env.SMTP_EMAIL, pass: process.env.SMTP_PASS },
    });

    await transporter.sendMail({
      from: process.env.FROM_EMAIL || `"NiNi Funny" <${process.env.SMTP_EMAIL}>`,
      to: email,
      subject: 'Xác minh email NiNi',
      html: `<p>Nhấn để xác minh: <a href="${link}">Xác minh email</a></p>`,
    });

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
