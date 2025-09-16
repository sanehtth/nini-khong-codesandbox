// Issues a signed, expiring cookie for /admin
const crypto = require("crypto");

// parse "15m", "2h", "7d" or "3600" → seconds
function ttlToSeconds(ttl) {
  const s = String(ttl || "24h").trim();
  const m = s.match(/^(\d+)\s*([smhd])?$/i);
  if (!m) return 86400;
  const n = parseInt(m[1], 10);
  const u = (m[2] || "s").toLowerCase();
  const mul = u === "m" ? 60 : u === "h" ? 3600 : u === "d" ? 86400 : 1;
  // clamp 1 minute .. 30 days
  return Math.max(60, Math.min(n * mul, 30 * 86400));
}
function b64url(input) {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/,"");
}
function sign(secret, data) {
  return b64url(crypto.createHmac("sha256", secret).update(data).digest());
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  const { password } = JSON.parse(event.body || "{}");
  const ADMIN_SECRET = process.env.ADMIN_SECRET || "";
  const COOKIE_NAME  = process.env.COOKIE_NAME  || "nini_admin";
  const ttlSec       = ttlToSeconds(process.env.ADMIN_TOKEN_TTL);

  if (!ADMIN_SECRET) return { statusCode: 500, body: "ADMIN_SECRET not set" };
  if (!password || password !== ADMIN_SECRET)
    return { statusCode: 401, body: JSON.stringify({ ok:false, msg:"Sai mật khẩu" }) };

  const now = Math.floor(Date.now()/1000);
  const payloadObj = { sub:"admin", iat:now, exp:now + ttlSec, v:1, r:b64url(crypto.randomBytes(8)) };
  const payload = b64url(JSON.stringify(payloadObj));
  const sig = sign(ADMIN_SECRET, payload);
  const token = `${payload}.${sig}`;

  const cookie = [
    `${COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${ttlSec}`
  ].join("; ");

  return {
    statusCode: 200,
    headers: { "Set-Cookie": cookie, "Content-Type":"application/json" },
    body: JSON.stringify({ ok:true, ttl: ttlSec })
  };
};
