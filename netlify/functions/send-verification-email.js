// netlify/functions/verification-email.js
// Nếu muốn giữ tên cũ: đổi lại tên file này thành send-verification-email.js
// và trên frontend gọi /.netlify/functions/send-verification-email

const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*', // hoặc set origin cụ thể: 'https://nini-funny.com'
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
};

// --- INIT FIREBASE ADMIN (idempotent) ---
function initFirebase() {
  if (admin.apps.length) return;

  // Một số môi trường sẽ bao quanh private key bằng dấu " — ta bỏ nếu có
  const rawKey = process.env.FIREBASE_PRIVATE_KEY || '';
  const cleanedKey = rawKey
    .replace(/^"|"$/g, '')            // bỏ quote đầu/cuối nếu có
    .replace(/\\n/g, '\n');           // trả newline đúng

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  if (!projectId || !clientEmail || !cleanedKey) {
    throw new Error(
      'Thiếu biến môi trường FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY'
    );
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey: cleanedKey,
    }),
  });
}

// --- CREATE TRANSPORTER ---
function createTransporter() {
  // Ưu tiên PORT nếu là 465 thì secure=true, còn lại secure=false trừ khi ép bằng env
  const port = Number(process.env.SMTP_PORT || 465);
  const secureByPort = port === 465; // SMTPS
  const secure =
    (process.env.SMTP_SECURE ?? '').toString() === 'true' ? true : secureByPort;

  const user = process.env.SMTP_USER || process.env.SMTP_EMAIL;
  const pass = process.env.SMTP_PASS;
  const host = process.env.SMTP_HOST;

  if (!host || !user || !pass) {
    throw new Error(
      'Thiếu biến môi trường SMTP_HOST / (SMTP_USER|SMTP_EMAIL) / SMTP_PASS'
    );
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

// --- SIMPLE EMAIL VALIDATOR ---
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '');
}

exports.handler = async (event) => {
  try {
    // CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers: CORS_HEADERS, body: '' };
    }

    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Method Not Allowed' }),
      };
    }

    let payload = {};
    try {
      payload = JSON.parse(event.body || '{}');
    } catch {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Body phải là JSON' }),
      };
    }

    const { email } = payload;
    if (!isValidEmail(email)) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Email không hợp lệ' }),
      };
    }

    // 1) Init Firebase Admin
    initFirebase();

    // 2) Tạo verification link của Firebase Auth
    //    url trỏ về trang custom của bạn (đã host sẵn)
    const continueUrl =
      process.env.EMAIL_VERIFY_REDIRECT_URL ||
      'https://nini-funny.com/auth-action.html';

    const link = await admin.auth().generateEmailVerificationLink(email, {
      url: continueUrl,
      handleCodeInApp: true,
    });

    // 3) Gửi email qua SMTP
    const transporter = createTransporter();

    const fromEmail =
      process.env.FROM_EMAIL ||
      (process.env.SMTP_EMAIL ? `NiNi Funny <${process.env.SMTP_EMAIL}>` : undefined);

    if (!fromEmail) {
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: 'Thiếu FROM_EMAIL (hoặc SMTP_EMAIL) để set địa chỉ gửi',
        }),
      };
    }

    const info = await transporter.sendMail({
      from: fromEmail,
      to: email,
      subject: 'Xác minh email NiNi',
      html: `
        <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.6">
          <p>Chào bạn,</p>
          <p>Nhấn vào nút bên dưới để xác minh email của bạn:</p>
          <p>
            <a href="${link}" style="display:inline-block;padding:10px 16px;text-decoration:none;border-radius:8px;border:1px solid #ddd">
              Xác minh email
            </a>
          </p>
          <p>Nếu không click được, hãy dán liên kết này vào trình duyệt:</p>
          <p style="word-break:break-all">${link}</p>
        </div>`,
    });

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ ok: true, messageId: info.messageId }),
    };
  } catch (e) {
    // Log sẽ thấy trong Netlify → Functions → Logs
    console.error('verification-email error:', e);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: e.message || 'Server error' }),
    };
  }
};
