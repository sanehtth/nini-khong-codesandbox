// netlify/functions/send-reset.js
const nodemailer = require("nodemailer");

const ALLOWED_ORIGIN = process.env.APP_PUBLIC_URL || "https://nini-funny.com";

const ok = (body = "") => ({
  statusCode: 200,
  headers: {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json; charset=utf-8",
  },
  body: typeof body === "string" ? body : JSON.stringify(body),
});

const noContent = () => ({
  statusCode: 204,
  headers: {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  },
  body: "",
});

const bad = (code, message) => ({
  statusCode: code,
  headers: {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json; charset=utf-8",
  },
  body: JSON.stringify({ error: message }),
});

exports.handler = async (event) => {
  // 1) Preflight
  if (event.httpMethod === "OPTIONS") {
    return noContent();
  }

  // 2) Chỉ nhận POST
  if (event.httpMethod !== "POST") {
    return bad(405, "Method Not Allowed");
  }

  // 3) Parse body
  let email, link;
  try {
    const payload = JSON.parse(event.body || "{}");
    email = (payload.email || "").trim();
    link = (payload.link || "").trim();
  } catch {
    return bad(400, "Invalid JSON");
  }
  if (!email) return bad(400, "Missing email");
  if (!link) link = `${ALLOWED_ORIGIN}/#/home`;

  // 4) SMTP config từ biến môi trường
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_SECURE, // "true"/"false"
    SMTP_USER,
    SMTP_PASS,
    FROM_EMAIL,
    FROM_NAME,
  } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !FROM_EMAIL) {
    return bad(500, "SMTP is not configured");
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: String(SMTP_SECURE).toLowerCase() === "true",
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  const mail = {
    from: `${FROM_NAME || "NiNi — Funny"} <${FROM_EMAIL}>`,
    to: email,
    subject: "NiNi — Link đặt lại mật khẩu",
    html: `
      <p>Xin chào,</p>
      <p>Bạn (hoặc ai đó) đã yêu cầu đặt lại mật khẩu trên NiNi.</p>
      <p>Nhấn vào liên kết dưới đây để tiếp tục:</p>
      <p><a href="${link}" target="_blank" rel="noopener noreferrer">${link}</a></p>
      <hr>
      <p>Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
    `,
  };

  try {
    await transporter.sendMail(mail);
    return ok({ ok: true });
  } catch (err) {
    return bad(500, `Send failed: ${err.message}`);
  }
};
