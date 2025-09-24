// netlify/functions/admin-auth.js
// === NiNi — Admin Auth (CommonJS for Netlify) ==============================
// Routes:
//   POST /.netlify/functions/admin-auth/login   { secret }
//   POST /.netlify/functions/admin-auth/refresh
//   POST /.netlify/functions/admin-auth/logout
//   GET  /.netlify/functions/admin-auth/ping    -> {ok:true} (debug/health)
// Env vars (Netlify -> Project settings -> Environment variables):
//   ADMIN_SECRET                (bắt buộc)
//   ADMIN_SESSION_TTL_HOURS     (tuỳ chọn, mặc định 6)

const crypto = require("crypto");

// ---- helpers ---------------------------------------------------------------
function json(statusCode, data, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      ...extraHeaders,
    },
    body: JSON.stringify(data),
  };
}

function getPathAction(event) {
  // e.g. "/.netlify/functions/admin-auth/login" -> "login"
  const p = event.path || "";
  const seg = p.split("/").filter(Boolean);
  return seg[seg.length - 1] || "";
}

function parseBody(event) {
  if (!event.body) return {};
  try {
    return JSON.parse(event.body);
  } catch (_) {
    return {};
  }
}

function safeEqual(a, b) {
  const aBuf = Buffer.from(a || "");
  const bBuf = Buffer.from(b || "");
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function base64url(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function signToken(payload, ttlHours) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const exp = now + Math.max(1, (ttlHours || 6) * 3600);
  const data = { ...payload, iat: now, exp };

  const encHeader = base64url(JSON.stringify(header));
  const encPayload = base64url(JSON.stringify(data));
  const msg = `${encHeader}.${encPayload}`;

  const key = process.env.ADMIN_SECRET || "";
  const sig = crypto
    .createHmac("sha256", key)
    .update(msg)
    .digest();
  const encSig = base64url(sig);

  return `${msg}.${encSig}`;
}

function verifyToken(token) {
  try {
    const [h, p, s] = String(token || "").split(".");
    if (!h || !p || !s) return null;
    const key = process.env.ADMIN_SECRET || "";
    const expected = base64url(
      crypto.createHmac("sha256", key).update(`${h}.${p}`).digest()
    );
    if (!safeEqual(expected, s)) return null;
    const payload = JSON.parse(Buffer.from(p, "base64").toString("utf8"));
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;
    return payload;
  } catch (_) {
    return null;
  }
}

function cookieSet(token, ttlHours) {
  const maxAge = Math.max(1, (ttlHours || 6) * 3600);
  // Path=/ ; HttpOnly ; Secure ; SameSite=Lax
  return `nini_admin=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

function cookieClear() {
  return "nini_admin=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax";
}

// ---- handler ---------------------------------------------------------------
exports.handler = async function (event) {
  // Preflight CORS
  if (event.httpMethod === "OPTIONS") {
    return json(200, { ok: true });
  }

  const action = getPathAction(event);
  const TTL = Number(process.env.ADMIN_SESSION_TTL_HOURS || "6");

  // Quick health-check (debug)
  if (event.httpMethod === "GET" && action === "ping") {
    const hasSecret = !!process.env.ADMIN_SECRET;
    return json(200, { ok: true, hasSecret });
  }

  // Ensure env var exists
  if (!process.env.ADMIN_SECRET) {
    return json(
      500,
      {
        ok: false,
        error: "Missing ENV ADMIN_SECRET (Netlify Project Settings → Env vars).",
      }
    );
  }

  try {
    // ---- POST /login --------------------------------------------------------
    if (event.httpMethod === "POST" && action === "login") {
      const { secret } = parseBody(event);
      if (!secret) return json(400, { ok: false, error: "Missing 'secret'." });

      const ok = safeEqual(secret, process.env.ADMIN_SECRET);
      if (!ok) {
        return json(401, { ok: false, error: "Wrong secret." });
      }

      const token = signToken({ role: "admin" }, TTL);
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": cookieSet(token, TTL),
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        },
        body: JSON.stringify({ ok: true }),
      };
    }

    // ---- POST /refresh ------------------------------------------------------
    if (event.httpMethod === "POST" && action === "refresh") {
      const cookie = (event.headers.cookie || event.headers.Cookie || "");
      const m = cookie.match(/(?:^|;\s*)nini_admin=([^;]+)/);
      const token = m ? m[1] : "";
      const payload = verifyToken(token);
      if (!payload) {
        return json(401, { ok: false, error: "No/invalid session." });
      }
      const newToken = signToken({ role: "admin" }, TTL);
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": cookieSet(newToken, TTL),
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        },
        body: JSON.stringify({ ok: true }),
      };
    }

    // ---- POST /logout -------------------------------------------------------
    if (event.httpMethod === "POST" && action === "logout") {
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": cookieClear(),
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        },
        body: JSON.stringify({ ok: true }),
      };
    }

    // ---- Not found ----------------------------------------------------------
    return json(404, { ok: false, error: `Unknown route: ${action}` });
  } catch (err) {
    // Trả lỗi rõ ràng (để tránh 502 mù)
    return json(500, { ok: false, error: err.message || "Server error." });
  }
};
