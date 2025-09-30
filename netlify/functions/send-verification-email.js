/**
 * netlify/functions/send-verification-email.js
 *
 * Gửi email xác minh tài khoản cho user bằng Firebase Admin + SMTP
 * Yêu cầu biến môi trường trong Netlify:
 *   - FIREBASE_PROJECT_ID
 *   - FIREBASE_CLIENT_EMAIL
 *   - FIREBASE_PRIVATE_KEY
 *   - VERIFY_EMAIL_TARGET_URL (vd: https://nini-funny.com/verify-email.html)
 *   - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE
 *   - FROM_EMAIL (vd: "NiNi Funny <no-reply@nini-funny.com>")
 */

const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Lambda function handler
 */
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { email } = JSON.parse(event.body || "{}");
    if (!email) {
      return { statusCode: 400, body: "Missing email" };
    }

    // Tạo link xác minh qua Firebase Admin
    const link = await admin
      .auth()
      .generateEmailVerificationLink(email, {
        url: process.env.VERIFY_EMAIL_TARGET_URL,
        handleCodeInApp: true,
      });

    // Soạn nội dung email
    const mailOptions = {
      from: process.env.FROM_EMAIL || "NiNi Funny <no-reply@nini-funny.com>",
      to: email,
      subject: "Xác minh email - NiNi Funny",
      html: `
        <div style="font-family: Arial, sans-serif; line-height:1.6;">
          <h2>Chào bạn!</h2>
          <p>Bạn vừa đăng ký tài khoản tại <b>NiNi Funny</b>.</p>
          <p>Vui lòng bấm vào nút dưới đây để xác minh email của bạn:</p>
          <p>
            <a href="${link}" 
               style="background:#4CAF50;color:#fff;padding:10px 20px;
                      text-decoration:none;border-radius:5px;display:inline-block;">
              Xác minh email
            </a>
          </p>
          <p>Nếu bạn không tạo tài khoản này, hãy bỏ qua email.</p>
          <hr/>
          <small>NiNi Funny</small>
        </div>
      `,
    };

    // Gửi mail
    await transporter.sendMail(mailOptions);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: "Verification email sent!" }),
    };
  } catch (err) {
    console.error("Error sending verification email:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
