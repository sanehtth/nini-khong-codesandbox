// netlify/functions/send-reset.js
const nodemailer = require("nodemailer");

// --- CORS helper ---
const corsHeaders = {
  "Access-Control-Allow-Origin":
    process.env.CORS_ORIGIN || "https://nini-funny.com",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
  "Content-Type": "application/json; charset=utf-8",
};

const ok = (statusCode, data) => ({
  statusCode,
  headers: corsHeaders,
  body: JSON.stringify(data),
});

exports.handler = async (event) => {
  // 1) Preflight CORS
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders };
  }

  // 2) Only POST
  if (event.httpMethod !== "POST") {
    return ok(405, { error: "Method Not Allowed" });
  }

  // 3) Parse body
  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return ok(400, { error: "Invalid JSON body" });
  }
  const email = (payload.email || "").trim();
  const link =
    payload.link ||
    "https://nini-funny.com/#/home"; // link fallback nếu FE không truyền

  // 4) Validate email
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(email)) {
    return ok(400, { error: "Invalid email" });
  }

  // 5) Kiểm tra biến môi trường SMTP
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    FROM_EMAIL,
    FROM_NAME,
  } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !FROM_EMAIL) {
    return ok(500, { error: "SMTP is not configured" });
  }

  // 6) Tạo transporter
  let transporter;
  try {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: String(SMTP_PORT) === "465", // 465 -> SSL, 587 -> STARTTLS
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    // Tùy chọn (đỡ fail do self-signed trong vài hạ tầng)
    // await transporter.verify();
  } catch (e) {
    return ok(500, { error: "SMTP transporter error", detail: e.message });
  }

  // 7) Nội dung email
  const fromName = FROM_NAME || "NiNi Funny";
  const mail = {
    from: `${fromName} <${FROM_EMAIL}>`,
    to: email,
    subject: "Khôi phục mật khẩu • NiNi Funny",
    text: `Xin chào,
Bạn vừa yêu cầu khôi phục mật khẩu cho tài khoản tại NiNi Funny.

Bấm vào liên kết sau để đặt lại mật khẩu:
${link}

Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email.

— ${fromName}`,
    html: `
      <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;line-height:1.6">
        <p>Xin chào,</p>
        <p>Bạn vừa yêu cầu khôi phục mật khẩu cho tài khoản tại <b>NiNi Funny</b>.</p>
        <p>
          <a href="${link}" style="display:inline-block;background:#10b981;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px">
            Đặt lại mật khẩu
          </a>
        </p>
        <p>Hoặc mở liên kết: <br/><a href="${link}">${link}</a></p>
        <hr/>
        <p style="color:#6b7280">Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email.</p>
        <p>— ${fromName}</p>
      </div>
    `,
  };

  // 8) Gửi
  try {
    await transporter.sendMail(mail);
    return ok(200, { ok: true });
  } catch (e) {
    return ok(502, { error: "Send mail failed", detail: e.message });
  }
};
