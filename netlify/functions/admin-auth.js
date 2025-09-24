// netlify/functions/admin-auth.js
// NiNi — Admin Auth (router 4 endpoint): login / check / refresh / logout

const crypto = require("crypto");

// --------- Safe base64url helpers (polyfill) ----------
function b64urlEncode(objOrStr) {
  const s = typeof objOrStr === "string" ? objOrStr : JSON.stringify(objOrStr);
  return Buffer.from(s)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}
function b64urlDecodeToJSON(b64) {
  const pad = b64 + "===".slice((b64.length + 3) % 4);
  const s = Buffer.from(pad.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
  try { return JSON.parse(s); } catch { return null; }
}

// --------- Config / env ---------
const ENC_KEY = process.env.ADMIN_JWT_KEY || crypto.randomBytes(32).toString("hex");
const SESSION_TTL_MIN = parseInt(process.env.ADMIN_SESSION_TTL_MIN || "360", 10); // 6h
const REFRESH_TTL_H  = parseInt(process.env.ADMIN_REFRESH_TTL_HOUR || "72", 10);  // 3 ngày
const ADMIN_SECRET   = process.env.ADMIN_SECRET || process.env.admin_secret || "";

if (!ADMIN_SECRET) {
  console.warn("WARNING: ADMIN_SECRET is empty. Set it in Netlify environment variables.");
}

// --------- JWT (HMAC SHA256) ----------
function sign(payload, ttlSec) {
  const header = { alg: "HS256", typ: "JWT" };
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const body = { ...payload, exp };
  const h = b64urlEncode(header);
  const b = b64urlEncode(body);
  const data = `${h}.${b}`;
  const sig = crypto.createHmac("sha256", ENC_KEY).update(data).digest("base64")
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${data}.${sig}`;
}

function verify(token) {
  try {
    const [h, b, s] = (token || "").split(".");
    if (!h || !b || !s) return null;
    const data = `${h}.${b}`;
    const sig = crypto.createHmac("sha256", ENC_KEY).update(data).digest("base64")
      .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    if (sig !== s) return null;
    const body = b64urlDecodeToJSON(b);
    if (!body || !body.exp || body.exp < Math.floor(Date.now() / 1000)) return null;
    return body;
  } catch {
    return null;
  }
}

// --------- Cookie helpers ----------
function setCookie(name, value, attrs = {}) {
  const parts = [`${name}=${value}`];
  if (attrs.httpOnly) parts.push("HttpOnly");
  if (attrs.sameSite) parts.push(`SameSite=${attrs.sameSite}`);
  if (attrs.secure)   parts.push("Secure");
  if (attrs.path)     parts.push(`Path=${attrs.path}`);
  if (attrs.maxAge != null) parts.push(`Max-Age=${attrs.maxAge}`);
  return parts.join("; ");
}
function parseCookies(raw = "") {
  const out = {};
  raw.split(";").forEach(p => {
    const i = p.indexOf("="); if (i < 0) return;
    const k = p.slice(0, i).trim(); const v = p.slice(i + 1).trim();
    out[k] = v;
  });
  return out;
}

// --------- HTTP helpers ----------
function json(status, body, extraHeaders = {}) {
  return {
    statusCode: status,
    headers: { "content-type": "application/json; charset=utf-8", ...extraHeaders },
    body: JSON.stringify(body)
  };
}
function noContent(extraHeaders = {}) { return { statusCode: 204, headers: extraHeaders, body: "" }; }

// --------- Handler ----------
exports.handler = async (event) => {
  try {
    const method = event.httpMethod || "GET";
    // event.path ví dụ: "/.netlify/functions/admin-auth/login"
    const last = (event.path || "").split("?")[0].split("/").pop(); // login|check|refresh|logout

    if (method === "POST" && last === "login") {
      // ---- LOGIN ----
      let body = {};
      try { body = JSON.parse(event.body || "{}"); } catch { body = {}; }
      const password = (body.password || "").trim();

      if (!ADMIN_SECRET) {
        return json(500, { ok: false, msg: "Server chưa cấu hình ADMIN_SECRET" });
      }
      if (!password || password !== ADMIN_SECRET) {
        return json(401, { ok: false, msg: "Sai mật khẩu." });
      }

      const session = sign({ role: "admin" }, SESSION_TTL_MIN * 60);
      const refresh = sign({ role: "admin", kind: "refresh" }, REFRESH_TTL_H * 3600);

      return json(200, { ok: true }, {
        "set-cookie": [
          setCookie("admin_session", session, {
            httpOnly: true, sameSite: "Lax", secure: true, path: "/",
            maxAge: SESSION_TTL_MIN * 60
          }),
          setCookie("admin_refresh", refresh, {
            httpOnly: true, sameSite: "Lax", secure: true, path: "/",
            maxAge: REFRESH_TTL_H * 3600
          })
        ]
      });
    }

    if (method === "GET" && last === "check") {
      // ---- CHECK ----
      const cookies = parseCookies(event.headers.cookie || "");
      const ok = cookies.admin_session && verify(cookies.admin_session);
      return ok ? json(200, { ok: true }) : json(401, { ok: false });
    }

    if (method === "POST" && last === "refresh") {
      // ---- REFRESH ----
      const cookies = parseCookies(event.headers.cookie || "");
      const r = cookies.admin_refresh && verify(cookies.admin_refresh);
      if (!r || r.role !== "admin" || r.kind !== "refresh") {
        return json(401, { ok: false, msg: "Refresh hết hạn" });
      }
      const session = sign({ role: "admin" }, SESSION_TTL_MIN * 60);
      return json(200, { ok: true }, {
        "set-cookie": setCookie("admin_session", session, {
          httpOnly: true, sameSite: "Lax", secure: true, path: "/",
          maxAge: SESSION_TTL_MIN * 60
        })
      });
    }

    if (method === "POST" && last === "logout") {
      // ---- LOGOUT ----
      return noContent({
        "set-cookie": [
          setCookie("admin_session", "", { httpOnly: true, sameSite: "Lax", secure: true, path: "/", maxAge: 0 }),
          setCookie("admin_refresh", "", { httpOnly: true, sameSite: "Lax", secure: true, path: "/", maxAge: 0 })
        ]
      });
    }

    return json(404, { ok: false, msg: "Not found" });
  } catch (e) {
    console.error("admin-auth error:", e);
    return json(502, { ok: false, msg: "Function crashed" });
  }
};
