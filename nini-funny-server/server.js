// ====== MIDDLEWARE ======
import express from "express";
import cors from "cors";

const app = express();

// CHO PHÉP NETLIFY FRONTEND GỌI VÀO
const ALLOW_ORIGIN = process.env.CORS_ORIGIN || "https://nini-funny.com";
app.use(cors({
  origin: [ALLOW_ORIGIN],
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false
}));
app.use(express.json());

// ====== ROUTES CƠ BẢN ======

// test server còn sống
app.get("/api/ping", (req, res) => {
  res.json({ ok: true, message: "pong" });
});

// mở preflight cho POST /api/send-reset (tránh lỗi CORS preflight)
app.options("/api/send-reset", (req, res) => res.sendStatus(204));

// xử lý gửi reset password (tối thiểu, bạn thay phần gửi mail thực tế của bạn)
app.post("/api/send-reset", async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ message: "Email is required" });

    // TODO: GỬI MAIL Ở ĐÂY (nodemailer hoặc Firebase Admin)
    // await transporter.sendMail({ from: ..., to: email, subject: ..., html: ... });

    return res.json({ success: true, message: "Đã nhận yêu cầu reset" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Server error" });
  }
});

// ====== LISTEN ======
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server up on port", PORT));
