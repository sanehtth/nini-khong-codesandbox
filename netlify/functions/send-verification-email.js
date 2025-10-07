// netlify/functions/send-verification-email.js
// Gửi email xác minh + auto-create user nếu chưa có

const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const CORS = {
  'Access-Control-Allow-Origin': '*', // có thể đổi thành 'https://nini-funny.com'
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
};

function initFirebase() {
  if (admin.apps.length) return;
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '')
    .replace(/^"|"$/g, '')
    .replace(/\\n/g, '\n');
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('MISSING_FIREBASE_ENV');
  }
  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
}

function makeTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER || process.env.SMTP_EMAIL;
  const pass = process.env.SMTP_PASS;
  const secure = (process.env.SMTP_SECURE ?? '').toString() === 'true' ? true : port === 465;
  if (!host || !user || !pass) throw new Error('MISSING_SMTP_ENV');
  return nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
}

const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s || '');

async function ensureUser(email, createIfMissing = true) {
  try {
    return await admin.auth().getUserByEmail(email);
  } catch (e) {
    if (e?.code !== 'auth/user-not-found') throw e;
    if (!createIfMissing) {
      const err = new Error('USER_NOT_FOUND');
      err.code = 'USER_NOT_FOUND';
      throw err;
    }
    // tạo user với mật khẩu ngẫu nhiên
    const randomPass = crypto.randomBytes(9).toString('base64');
    try {
      return await admin.auth().createUser({
        email,
        password: randomPass,
        emailVerified: false,
        disabled: false,
      });
    } catch (ce) {
      if (ce?.code === 'auth/email-already-exists') {
        return await admin.auth().getUserByEmail(email);
      }
      throw ce;
    }
  }
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    let body = {};
    try { body = JSON.parse(event.body || '{}'); } catch {}
    const email = (body.email || '').trim().toLowerCase();
    const createIfMissing = body.createIfMissing !== false; // mặc định true

    if (!isEmail(email)) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'INVALID_EMAIL' }) };
    }

    // 1) Firebase: đảm bảo user tồn tại
    initFirebase();
    const user = await ensureUser(email, createIfMissing);

    // 2) Tạo verify link; xong sẽ quay về auth-action.html để sang bước reset
    const base = process.env.EMAIL_VERIFY_REDIRECT_URL || 'https://nini-funny.com/auth-action.html';
    const params = new URLSearchParams({ next: 'reset', email });
    const continueUrl = `${base}?${params.toString()}`;

    const verifyLink = await admin.auth().generateEmailVerificationLink(email, {
      url: continueUrl,
      handleCodeInApp: true,
    });

    // 3) Gửi mail
    const tx = makeTransporter();
    await tx.verify();

    const fromHeader =
      process.env.FROM_EMAIL ||
      (process.env.SMTP_EMAIL ? `NiNi Funny <${process.env.SMTP_EMAIL}>` : undefined);
    if (!fromHeader) {
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'MISSING_FROM_EMAIL' }) };
    }
    const envelopeFrom = process.env.SMTP_ENVELOPE_FROM || fromHeader.replace(/^.*<|>.*$/g, '');

    const info = await tx.sendMail({
      from: fromHeader,
      to: email,
      subject: 'Xác minh email NiNi & đặt mật khẩu',
      html: `
        <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.6">
          <p>Chào bạn,</p>
          <p>Bấm nút để <b>xác minh email</b>. Sau khi xác minh, hệ thống sẽ chuyển bạn sang trang <b>đặt mật khẩu mới</b>.</p>
          <p><a href="${verifyLink}" style="display:inline-block;padding:10px 14px;border-radius:8px;border:1px solid #ddd;text-decoration:none">Xác minh & đặt mật khẩu</a></p>
          <p>Nếu không bấm được, hãy copy liên kết dưới và dán vào trình duyệt:</p>
          <p style="word-break:break-all">${verifyLink}</p>
        </div>`,
      envelope: { from: envelopeFrom, to: email },
    });

    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, uid: user.uid, messageId: info.messageId }) };
  } catch (e) {
    console.error('send-verification-email error:', e);
    const msg =
      e?.message?.includes('MISSING_FIREBASE_ENV') ? 'MISSING_FIREBASE_ENV' :
      e?.message?.includes('MISSING_SMTP_ENV') ? 'MISSING_SMTP_ENV' :
      e?.message || 'SERVER_ERROR';
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: msg }) };
  }
};
