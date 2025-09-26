// netlify/functions/send-reset.js
// Gửi email quên mật khẩu qua SMTP (Gmail/Yahoo, v.v.)
// CORS + preflight đầy đủ

const nodemailer = require("nodemailer");

// Để dễ đổi mà không phải sửa code, tất cả lấy từ ENV
const {
  // CORS
  CORS_ORIGIN = "https://nini-funny.com",

  // Link dẫn người dùng sau khi bấm trong mail (tuỳ bạn)
  APP_PUBLIC_URL = "https://nini-funny.com/#/home",

  // SMTP
  SMTP_HOST = "smtp.gmail.com",
  SMTP_PORT = "465",
  SMTP_SECURE = "true", // "true" cho 465, "false" cho 587
  SMTP_USER,
  SMTP_PASS,

  // From
  FROM_EMAIL,
  FROM_NAME = "NiNi — Funny",
} = process.env;

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": CORS_ORIGIN,
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

exports.handler = async (event) => {
  // Preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders, body: "" };
  }

  // Chỉ cho POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    // Lấy email từ body
    let payload = {};
    try {
      payload = JSON.parse(event.body || "{}");
    } catch (_) {}

    const email = (payload.email || "").trim().toLowerCase();

    // Validate email đơn giản
    const okEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!okEmail) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ ok: false, error: "Email không hợp lệ" }),
      };
    }

    // Kiểm tra biến môi trường bắt buộc
    if (!SMTP_USER || !SMTP_PASS || !FROM_EMAIL) {
      console.error("Missing SMTP envs", { SMTP_USER: !!SMTP_USER, SMTP_PASS: !!SMTP_PASS, FROM_EMAIL: !!FROM_EMAIL });
      return {
        statusCode: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ ok: false, error: "SMTP is not configured" }),
      };
    }

    // Tạo transporter
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: String(SMTP_SECURE).toLowerCase() === "true",
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    // Nội dung email (tuỳ bạn customize)
    const resetLink = APP_PUBLIC_URL; // có thể kèm token nếu bạn tự sinh
    const html = `
      <div style="font-family:system-ui,Arial;line-height:1.6">
        <h2>Yêu cầu đặt lại mật khẩu</h2>
        <p>Email nhận: <b>${email}</b></p>
        <p>Nhấn nút bên dưới để tiếp tục đặt lại mật khẩu:</p>
        <p>
          <a href="${resetLink}" style="display:inline-block;background:#16a34a;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;">
            Mở NiNi — Funny
          </a>
        </p>
        <p>Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email.</p>
        <hr/>
        <small>NiNi — Funny</small>
      </div>
    `;

    await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: email,
      subject: "Đặt lại mật khẩu — NiNi",
      html,
    });

    return {
      statusCode: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, message: "Đã gửi email đặt lại mật khẩu" }),
    };
  } catch (err) {
    console.error("send-reset error:", err);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "Server error" }),
    };
  }
};
