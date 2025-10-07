// netlify/functions/send-verification-email.js
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const CORS = {
  'Access-Control-Allow-Origin': '*', // đổi thành 'https://nini-funny.com' nếu muốn
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

function transporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER || process.env.SMTP_EMAIL;
  const pass = process.env.SMTP_PASS;
  const secure = (process.env.SMTP_SECURE ?? '').toString() === 'true' ? true : port === 465;
  if (!host || !user || !pass) throw new Error('MISSING_SMTP_ENV');
  return nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
}

const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s || '');

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    let body;
    try { body = JSON.parse(event.body || '{}'); } catch { body = {}; }
    const email = (body.email || '').trim().toLowerCase();
    const createIfMissing = body.createIfMissing !== false; // mặc định: true

    if (!isEmail(email)) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'INVALID_EMAIL' }) };
    }

    initFirebase();
// Sau khi đã: parse email, initFirebase()

async function ensureUser(email, createIfMissing = true) {
  try {
    // 1) Đã tồn tại -> trả về user
    return await admin.auth().getUserByEmail(email);
  } catch (e) {
    if (e?.code !== 'auth/user-not-found') throw e;
    if (!createIfMissing) throw Object.assign(new Error('USER_NOT_FOUND'), { code: 'USER_NOT_FOUND' });

    // 2) Chưa có -> tạo user (mật khẩu ngẫu nhiên)
    const crypto = require('crypto');
    const randomPass = crypto.randomBytes(9).toString('base64');

    try {
      return await admin.auth().createUser({
        email,
        password: randomPass,
        emailVerified: false,
        disabled: false,
      });
    } catch (ce) {
      // 3) Chống race condition: nếu vừa có ai tạo trước -> coi như tồn tại
      if (ce?.code === 'auth/email-already-exists') {
        return await admin.auth().getUserByEmail(email);
      }
      throw ce;
    }
  }
}

// --- dùng ở function handler ---
const userRecord = await ensureUser(email, /*createIfMissing=*/ true);
// ==> từ đây chắc chắn có userRecord; tiếp tục generateEmailVerificationLink + gửi mail

    // 1) Lấy (hoặc tạo) user
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
    } catch (e) {
      if (e?.code === 'auth/user-not-found') {
        if (!createIfMissing) {
          return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: 'USER_NOT_FOUND' }) };
        }
        const randomPass = crypto.randomBytes(9).toString('base64'); // ~12 ký tự
        userRecord = await admin.auth().createUser({
          email,
          password: randomPass,
          emailVerified: false,
          disabled: false,
        });
      } else {
        throw e;
      }
    }

    // 2) Tạo VERIFY link, kèm continueUrl để sau verify chuyển sang reset
    //    LƯU Ý: domain dưới đây phải nằm trong Firebase Auth → Authorized domains
    const base = process.env.EMAIL_VERIFY_REDIRECT_URL || 'https://nini-funny.com/auth-action.html';
    const params = new URLSearchParams({ next: 'reset', email }); // page sẽ đọc để gọi reset
    const continueUrl = `${base}?${params.toString()}`;

    const verifyLink = await admin.auth().generateEmailVerificationLink(email, {
      url: continueUrl,
      handleCodeInApp: true,
    });

    // 3) Gửi email
    const tx = transporter();
    await tx.verify(); // bắt lỗi quyền gửi sớm

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
          <p>Bấm nút để <b>xác minh email</b>. Sau khi xác minh, bạn sẽ được chuyển tới trang <b>đặt mật khẩu mới</b>.</p>
          <p>
            <a href="${verifyLink}" style="display:inline-block;padding:10px 14px;border-radius:8px;border:1px solid #ddd;text-decoration:none">
              Xác minh & đặt mật khẩu
            </a>
          </p>
          <p>Nếu không bấm được, copy link sau vào trình duyệt:</p>
          <p style="word-break:break-all">${verifyLink}</p>
        </div>`,
      envelope: { from: envelopeFrom, to: email },
    });

    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, uid: userRecord.uid, messageId: info.messageId }) };
  } catch (e) {
    console.error('send-verification-email error:', e);
    // chuẩn hóa vài lỗi quen thuộc
    const msg =
      e?.message?.includes('MISSING_FIREBASE_ENV') ? 'MISSING_FIREBASE_ENV' :
      e?.message?.includes('MISSING_SMTP_ENV') ? 'MISSING_SMTP_ENV' :
      e?.message || 'SERVER_ERROR';
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: msg }) };
  }
};

