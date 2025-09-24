// netlify/functions/admin-auth.js

/* ==========================================================
   NiNi — Admin Auth (single function)
   Endpoints:
     - POST  /.netlify/functions/admin-auth/login
     - POST  /.netlify/functions/admin-auth/logout
     - GET   /.netlify/functions/admin-auth/ping
     - POST  /.netlify/functions/admin-auth/refresh
   Yêu cầu ENV:  admin_secret
   Ghi chú: token ký HMAC, không cần DB. TTL mặc định 6h.
   ========================================================== */

export const config = { path: "/.netlify/functions/admin-auth/*" };

const crypto = await import("node:crypto");

const TTL_SEC = 6 * 60 * 60;          // 6 giờ
const REFRESH_THRESHOLD = 25 * 60;     // nếu còn <25' thì cho refresh

// ---------- helpers ----------
function json(status, body, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
  });
}

// Ký HMAC (sha256)
function hmac(secret, data) {
  return crypto.createHmac("sha256", secret).update(data).digest("hex");
}

// Sinh token: base64url(payload).<sig>
function createToken(secret, sub = "admin", ttlSec = TTL_SEC) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub,
    iat: now,
    exp: now + ttlSec,
    rnd: crypto.randomBytes(8).toString("hex"),
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = hmac(secret, body);
  return `${body}.${sig}`;
}

function verifyToken(secret, token) {
  try {
    const [body, sig] = token.split(".");
    if (!body || !sig) return { ok: false, reason: "bad-format" };
    const expect = hmac(secret, body);
    if (expect !== sig) return { ok: false, reason: "bad-signature" };
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    const now = Math.floor(Date.now() / 1000);
    if (now >= payload.exp) return { ok: false, reason: "expired" };
    return { ok: true, payload };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}

function getAuthTokenFrom(req) {
  // Ưu tiên header Authorization: Bearer xxx
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (m) return m[1];

  // Rơi về cookie
  const cookie = req.headers.get("cookie") || "";
  const k = cookie.split(";").map(s => s.trim());
  for (const c of k) {
    if (c.startsWith("nini_admin=")) return decodeURIComponent(c.slice(11));
  }
  return "";
}

// Lấy host để set cookie scope hợp lý
function cookieAttrsFrom(req) {
  const path = "/admin";
  const sameSite = "Lax"; // để link nội bộ không bị chặn
  const secure = "Secure"; // Netlify luôn https
  // KHÔNG ép Domain để cookie dùng đúng host hiện tại (tránh lệch apex/sub).
  return `Path=${path}; SameSite=${sameSite}; ${secure}`;
}

// ---------- handler ----------
export default async function handler(req) {
  const url = new URL(req.url);
  const secret = process.env.admin_secret; // <== tên đúng như bạn đang dùng
  if (!secret) {
    return json(500, { ok: false, error: "Missing env admin_secret" });
  }

  // CORS nhẹ cho GET/POST cùng origin
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": url.origin,
        "access-control-allow-methods": "GET,POST,OPTIONS",
        "access-control-allow-headers": "content-type,authorization",
      },
    });
  }

  const pathname = url.pathname.replace(/\/+$/, "");

  // ---------- /ping ----------
  if (pathname.endsWith("/ping") && req.method === "GET") {
    const token = getAuthTokenFrom(req);
    if (!token) return json(401, { ok: false, reason: "no-token" });
    const v = verifyToken(secret, token);
    if (!v.ok) return json(401, { ok: false, reason: v.reason });

    const now = Math.floor(Date.now() / 1000);
    const remain = v.payload.exp - now;
    return json(200, { ok: true, hasSecret: true, remain });
  }

  // ---------- /login ----------
  if (pathname.endsWith("/login") && req.method === "POST") {
    const { pass } = await req.json().catch(() => ({}));
    if (!pass) return json(400, { ok: false, error: "missing-pass" });

    // so sánh mật khẩu với admin_secret
    if (pass !== secret) {
      return json(400, { ok: false, error: "bad-password" });
    }

    const token = createToken(secret);
    // set kèm cookie (không bắt buộc, client cũng sẽ dùng localStorage)
    const cookie = `nini_admin=${encodeURIComponent(token)}; ${cookieAttrsFrom(req)}`;
    return json(
      200,
      { ok: true, token, ttl: TTL_SEC },
      { "set-cookie": cookie }
    );
  }

  // ---------- /refresh ----------
  if (pathname.endsWith("/refresh") && req.method === "POST") {
    const token = getAuthTokenFrom(req);
    if (!token) return json(401, { ok: false, error: "no-token" });

    const v = verifyToken(secret, token);
    if (!v.ok) return json(401, { ok: false, error: v.reason });

    const now = Math.floor(Date.now() / 1000);
    const remain = v.payload.exp - now;

    // Chỉ refresh khi còn ít hơn threshold
    if (remain > REFRESH_THRESHOLD) {
      return json(200, { ok: true, token, ttl: remain });
    }

    const newToken = createToken(secret);
    const cookie = `nini_admin=${encodeURIComponent(newToken)}; ${cookieAttrsFrom(req)}`;
    return json(
      200,
      { ok: true, token: newToken, ttl: TTL_SEC },
      { "set-cookie": cookie }
    );
  }

  // ---------- /logout ----------
  if (pathname.endsWith("/logout") && req.method === "POST") {
    const expired = `nini_admin=; ${cookieAttrsFrom(req)}; Max-Age=0`;
    return json(200, { ok: true }, { "set-cookie": expired });
  }

  // ---------- fallback ----------
  return json(404, { ok: false, error: "not-found" });
}
