// netlify/functions/make-reset-link.js
// Tạo link reset mật khẩu (chứa oobCode) để redirect thẳng vào reset-password.html

const admin = require('firebase-admin');

function init() {
  if (admin.apps.length) return;
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '')
    .replace(/^"|"$/g, '')
    .replace(/\\n/g, '\n');
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  });
}

exports.handler = async (event) => {
  const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json; charset=utf-8',
  };
  try {
    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };
    if (event.httpMethod !== 'POST') return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method Not Allowed' }) };

    const { email } = JSON.parse(event.body || '{}');
    if (!email) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'INVALID_EMAIL' }) };

    init();
    await admin.auth().getUserByEmail(email); // đảm bảo có user

    const link = await admin.auth().generatePasswordResetLink(email, {
      url: 'https://nini-funny.com/reset-password.html', // trang đặt pass của bạn
      handleCodeInApp: true,
    });

    return { statusCode: 200, headers: CORS, body: JSON.stringify({ link }) };
  } catch (e) {
    console.error('make-reset-link error:', e);
    return { statusCode: 500, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: e.message || 'SERVER_ERROR' }) };
  }
};
