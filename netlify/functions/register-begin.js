import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { getStore } from "@netlify/blobs";

const store = getStore({ name: "nini-users" });

const b64u = (s) => Buffer.from(s, "utf8").toString("base64url");
const sign = (p) => crypto.createHmac("sha256", process.env.AUTH_SECRET).update(p).digest("base64url");

export const handler = async (event) => {
  try {
    const { name, dob, email, pass } = JSON.parse(event.body || "{}");
    if (!name || !email || !pass) return bad("Thiếu dữ liệu");

    // Nếu email đã tồn tại
    const existed = await store.get(`user:${email}`);
    if (existed) return bad("Email đã có tài khoản.");

    // Băm mật khẩu tạm lưu trong pending
    const passhash = await bcrypt.hash(pass, 10);
    const otp = ("" + Math.floor(100000 + Math.random() * 900000)); // 6 số
    const exp = Date.now() + 10 * 60 * 1000;

    const pending = { name, dob, email, passhash, otp, exp };
    await store.set(`pending:${email}`, JSON.stringify(pending), { addRandomSuffix: false });

    // tạo tx ký
    const p = b64u(JSON.stringify({ email, exp }));
    const tx = `${p}.${sign(p)}`;

    // gửi email OTP
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });

    await transporter.sendMail({
      from: `"${process.env.FROM_NAME || "NiNi — Funny"}" <${process.env.FROM_EMAIL}>`,
      to: email,
      subject: "Mã xác nhận đăng ký NiNi — Funny",
      html: `<p>Mã OTP của bạn là: <b style="font-size:18px">${otp}</b></p><p>Mã hết hạn trong 10 phút.</p>`
    });

    return ok({ tx });
  } catch (e) { return bad(e.message, 500); }
};

const ok = (body) => ({ statusCode: 200, body: JSON.stringify({ ok: true, ...body }) });
const bad = (msg, code = 400) => ({ statusCode: code, body: JSON.stringify({ ok: false, msg }) });
