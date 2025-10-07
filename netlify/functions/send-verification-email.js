// netlify/functions/send-verification-email.js
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*', // đổi sang 'https://nini-funny.com' nếu muốn
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
};

function initFirebase() {
  if (admin.apps.length) return;

  const rawKey = process.env.FIREBASE_PRIVATE_KEY || '';
  const privateKey = rawKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n');

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('MISSING_FIREBASE_ENV');
  }

  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
}

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER || process.env.SMTP_EMAIL;
  const pass = process.env.SMTP_PASS;
  const secure =
    (process.env.SMTP_SECURE ?? '').toString() === 'true' ? true : port === 465;

  if (!host || !user || !pass) throw new Error('MISSING_SMTP_ENV');

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    // Một số mail pro yêu cầu tên miền khớp cert; nếu server dùng cert nội bộ, bật dòng dưới để debug:
    // tls: { rejectUnauthorized: false },
  });
}

function isValidEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s || '');
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers: CORS_HEADERS, body: '' };
    }
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    // Parse body
    let email = '';
    try {
      const body = JSON.parse(event.body || '{}');
      email = body.email;
    } catch {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'BODY_NOT_JSON' }) };
    }
    if (!isValidEmail(email)) {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'INVALID_EMAIL' }) };
    }

    // 1) Firebase: tạo verification link
    let verifyLink = '';
    try {
      initFirebase();

      const continueUrl =
        process.env.EMAIL_VERIFY_REDIRECT_URL || 'https://nini-funny.com/auth-action.html';

      // LƯU Ý: tên miền trong continueUrl phải có trong Firebase Auth → Authorized domains
      verifyLink = await admin.auth().generateEmailVerificationLink(email, {
        url: continueUrl,
        handleCodeInApp: true,
      });
    } catch (e) {
      console.error('FIREBASE_ERROR', e);
      // Gom nhóm lỗi thường gặp để bạn thấy rõ “không được quyền” là từ đâu
      const msg =
        e?.code === 'auth/invalid-credential'
          ? 'FIREBASE_INVALID_CREDENTIAL'
          : e?.message?.includes('not authorized') || e?.message?.includes('permission')
          ? 'FIREBASE_PERMISSION_DENIED'
          : e?.message?.includes('private key') || e?.message?.includes('PEM')
          ? 'FIREBASE_PRIVATE_KEY_BAD_FORMAT'
          : e?.message || 'FIREBASE_UNKNOWN';

      return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: msg }) };
    }

    // 2) SMTP: kiểm tra quyền gửi & gửi mail
    try {
      const transporter = createTransporter();

      // Kiểm tra quyền trước (nhiều “mail pro” trả lỗi ở bước này nếu không được phép gửi)
      await transporter.verify(); // sẽ throw nếu auth/perm sai

      const fromHeader =
        process.env.FROM_EMAIL ||
        (process.env.SMTP_EMAIL ? `NiNi Funny <${process.env.SMTP_EMAIL}>` : undefined);

      if (!fromHeader) {
        return {
          statusCode: 500,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: 'MISSING_FROM_EMAIL' }),
        };
      }

      // Một số server yêu cầu envelope.from đúng domain/user
      const envelopeFrom = process.env.SMTP_ENVELOPE_FROM || fromHeader.replace(/^.*<|>.*$/g, '');

      const info = await transporter.sendMail({
        from: fromHeader,
        to: email,
        subject: 'Xác minh email NiNi',
        html: `
          <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.6">
            <p>Chào bạn,</p>
            <p>Nhấn nút để xác minh email:</p>
            <p><a href="${verifyLink}" style="display:inline-block;padding:10px 16px;text-decoration:none;border-radius:8px;border:1px solid #ddd">Xác minh email</a></p>
            <p>Nếu không click được, copy link sau và dán vào trình duyệt:</p>
            <p style="word-break:break-all">${verifyLink}</p>
          </div>`,
        envelope: { from: envelopeFrom, to: email },
      });

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ ok: true, messageId: info.messageId }),
      };
    } catch (e) {
      console.error('SMTP_ERROR', e);
      // Chuẩn hoá thông điệp thường gặp của mail pro
      const msg =
        /Invalid login|Authentication failed|535|530/i.test(e?.message || '')
          ? 'SMTP_AUTH_FAILED'
          : /Sender verify failed|Sender address rejected|sender not allowed|550/i.test(e?.message || '')
          ? 'SMTP_SENDER_NOT_ALLOWED'
          : /Relay access denied|Relaying denied/i.test(e?.message || '')
          ? 'SMTP_RELAY_DENIED'
          : /TLS|certificate|self signed/i.test(e?.message || '')
          ? 'SMTP_TLS_CERT_ISSUE'
          : e?.message || 'SMTP_UNKNOWN';

      return { statusCode: 502, headers: CORS_HEADERS, body: JSON.stringify({ error: msg }) };
    }
  } catch (e) {
    console.error('UNCAUGHT', e);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: 'SERVER_ERROR' }) };
  }
};
