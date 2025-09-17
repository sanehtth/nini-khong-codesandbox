import bcrypt from "bcryptjs";
import crypto from "crypto";
import { getStore } from "@netlify/blobs";

const store = getStore({ name: "nini-users" });

export const handler = async (event) => {
  try {
    const { email, pass } = JSON.parse(event.body || "{}");
    if (!email || !pass) return bad("Thiếu email hoặc mật khẩu");

    const raw = await store.get(`user:${email}`);
    if (!raw) return bad("Sai email hoặc mật khẩu", 401);
    const user = JSON.parse(raw);

    const okPass = await bcrypt.compare(pass, user.passhash || "");
    if (!okPass) return bad("Sai email hoặc mật khẩu", 401);

    // tạo user_auth cookie 7 ngày
    const exp = Math.floor(Date.now()/1000) + 7*24*3600;
    const payload = Buffer.from(JSON.stringify({ sub: email, name: user.name, exp }), "utf8").toString("base64url");
    const sig = crypto.createHmac("sha256", process.env.AUTH_SECRET).update(payload).digest("base64url");
    const token = `${payload}.${sig}`;
    const expires = new Date(exp*1000).toUTCString();

    return {
      statusCode: 200,
      headers: { "Set-Cookie": `user_auth=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=${expires}` },
      body: JSON.stringify({ ok: true })
    };
  } catch (e) { return bad(e.message, 500); }
};

const bad = (msg, code=400) => ({ statusCode: code, body: JSON.stringify({ ok:false, msg }) });
