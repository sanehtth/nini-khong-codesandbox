import crypto from "crypto";
import { getStore } from "@netlify/blobs";

const store = getStore({ name: "nini-users" });
const parseTx = (tx) => {
  const [p, sig] = tx.split(".");
  const expSig = crypto.createHmac("sha256", process.env.AUTH_SECRET).update(p).digest("base64url");
  if (expSig !== sig) throw new Error("Chữ ký TX sai");
  return JSON.parse(Buffer.from(p, "base64url").toString("utf8"));
};

export const handler = async (event) => {
  try {
    const { email, code, tx } = JSON.parse(event.body || "{}");
    if (!email || !code || !tx) return bad("Thiếu dữ liệu");

    const { exp } = parseTx(tx);
    if (Date.now() > exp) return bad("TX hết hạn, gửi OTP lại.");

    const raw = await store.get(`pending:${email}`);
    if (!raw) return bad("Không tìm thấy phiên đăng ký.");
    const pending = JSON.parse(raw);

    if (Date.now() > pending.exp) return bad("OTP đã hết hạn.");
    if (code !== pending.otp) return bad("OTP sai.");

    // Lưu tài khoản chính thức
    await store.set(`user:${email}`, JSON.stringify({
      email,
      name: pending.name,
      dob: pending.dob,
      passhash: pending.passhash,
      createdAt: Date.now()
    }), { addRandomSuffix: false });

    // Xoá pending
    await store.delete(`pending:${email}`);

    return ok();
  } catch (e) { return bad(e.message, 400); }
};

const ok = (body={}) => ({ statusCode: 200, body: JSON.stringify({ ok: true, ...body }) });
const bad = (msg, code=400) => ({ statusCode: code, body: JSON.stringify({ ok: false, msg }) });
