// Gửi mã OTP qua email, trả về tx (token có ký)
const nodemailer = require("nodemailer");
const crypto = require("crypto");

function b64u(x){ return Buffer.from(x,"utf8").toString("base64url"); }
function sign(str, secret){ return crypto.createHmac("sha256", secret).update(str).digest("base64url"); }

exports.handler = async (event) => {
  try {
    const { email } = JSON.parse(event.body || "{}");
    if(!email) return { statusCode:400, body: JSON.stringify({ ok:false, msg:"Thiếu email" }) };

    const code = (""+Math.floor(100000 + Math.random()*900000)); // 6 digits
    const exp = Date.now() + 10*60*1000; // 10 phút
    const payload = JSON.stringify({ email, code, exp });
    const payloadB64 = b64u(payload);
    const token = `${payloadB64}.${sign(payloadB64, process.env.AUTH_SECRET)}`;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });

    const fromName = process.env.FROM_NAME || "NiNi — Funny";
    const fromMail = process.env.FROM_EMAIL;

    await transporter.sendMail({
      from: `"${fromName}" <${fromMail}>`,
      to: email,
      subject: "Mã xác nhận NiNi — Funny",
      html: `<p>Mã OTP của bạn là: <b style="font-size:18px">${code}</b></p><p>Hết hạn trong 10 phút.</p>`
    });

    return { statusCode:200, body: JSON.stringify({ ok:true, tx: token }) };
  } catch(e){
    return { statusCode:500, body: JSON.stringify({ ok:false, msg:e.message }) };
  }
};
