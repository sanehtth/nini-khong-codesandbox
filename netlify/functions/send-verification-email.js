// netlify/functions/send-verification-email.js
const nodemailer = require('nodemailer');
const admin = require('firebase-admin');

const ALLOW_ORIGIN = process.env.CORS_ORIGIN || 'https://nini-funny.com';
const cors = {
  'Access-Control-Allow-Origin': ALLOW_ORIGIN,
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization'
};

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
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: cors, body: JSON.stringify({ error:'Method Not Allowed' }) };

  try{
    const { email, continueUrl } = JSON.parse(event.body||'{}');
    if (!email) return { statusCode: 400, headers: cors, body: JSON.stringify({ error:'Missing email' }) };

    // tạo user nếu chưa có (password tạm)
    let user;
    try { user = await admin.auth().getUserByEmail(email); }
    catch { user = await admin.auth().createUser({ email, emailVerified:false, password: Math.random().toString(36).slice(2) + "!Ab9" }); }

    const link = await admin.auth().generateEmailVerificationLink(email, {
      url: continueUrl || 'https://nini-funny.com/verify_email.html',
      handleCodeInApp: true,
    });

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT || 465),
      secure: (process.env.SMTP_SECURE || 'true') === 'true',
      auth: { user: process.env.SMTP_USER || process.env.SMTP_EMAIL, pass: process.env.SMTP_PASS },
    });

    const from = process.env.FROM_EMAIL || `"NiNi Funny" <${process.env.SMTP_EMAIL}>`;
    const subject = process.env.VERIFY_SUBJECT || 'Xác minh email cho NiNi — Funny';

    const html = `
      <p>Xin chào,</p>
      <p>Nhấn nút dưới đây để xác minh email cho tài khoản NiNi:</p>
      <p><a href="${link}" target="_blank" rel="noopener" style="background:#2f6e3f;color:#fff;padding:10px 14px;border-radius:999px;text-decoration:none">Xác minh email</a></p>
      <p>Nếu không bấm được, hãy copy liên kết sau:</p>
      <p><a href="${link}">${link}</a></p>
    `;

    await transporter.sendMail({ from, to: email, subject, html });
    return { statusCode: 200, headers: cors, body: JSON.stringify({ ok:true }) };
  }catch(e){
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: e.message }) };
  }
};
