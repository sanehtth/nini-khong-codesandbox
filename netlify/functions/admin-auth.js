// netlify/functions/admin-auth.js
// NiNi — Admin Auth (Netlify Function)
// NOTE:
// - Remove top-level await (causing build fail with CJS output).
// - Use lazy resolver getSubtle() to access WebCrypto when needed.

const TOKEN_TTL = Number(process.env.ADMIN_TOKEN_TTL || 6 * 60 * 60); // 6h
const SECRET     = process.env.ADMIN_SECRET || "";
const COOKIE     = "nini_admin_token";
const SECURE     = true; // production
const DOMAIN     = undefined; // let browser infer

// ---------- helpers ----------
function json(status, body, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...extra,
    },
  });
}

function parseBody(req) {
  return req.json().catch(() => ({}));
}

function setCookie(resHeaders, value, maxAge) {
  const parts = [
    `${COOKIE}=${value}`,
    `Path=/`,
    `HttpOnly`,
    SECURE ? `Secure` : ``,
    `SameSite=Lax`,
    maxAge ? `Max-Age=${maxAge}` : ``,
    DOMAIN ? `Domain=${DOMAIN}` : ``,
  ].filter(Boolean);
  resHeaders.append("set-cookie", parts.join("; "));
}

function clearCookie(resHeaders) {
  const parts = [
    `${COOKIE}=`,
    `Path=/`,
    `HttpOnly`,
    SECURE ? `Secure` : ``,
    `SameSite=Lax`,
    `Max-Age=0`,
    DOMAIN ? `Domain=${DOMAIN}` : ``,
  ].filter(Boolean);
  resHeaders.append("set-cookie", parts.join("; "));
}

// ===== Fix: lazy WebCrypto (no top-level await) =====
let _subtle = null;
async function getSubtle() {
  if (_subtle) return _subtle;
  // Node 18+: crypto.webcrypto
  try {
    // dynamic import nhưng NẰM TRONG HÀM (không còn top-level await)
    const mod = await import("node:crypto");
    if (mod?.webcrypto?.subtle) {
      _subtle = mod.webcrypto.subtle;
      return _subtle;
    }
  } catch (_) {}
  // Edge/Browser fallback (nếu có)
  if (globalThis.crypto?.subtle) {
    _subtle = globalThis.crypto.subtle;
    return _subtle;
  }
  throw new Error("WebCrypto subtle is not available in this runtime.");
}

async function sha256Hex(str) {
  const subtle = await getSubtle();
  const enc = new TextEncoder().encode(str);
  const buf = await subtle.digest("SHA-256", enc);
  return Buffer.from(buf).toString("hex");
}

async function makeToken() {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + TOKEN_TTL;
  const payload = `${now}.${exp}`;
  const sig = await sha256Hex(`${payload}.${SECRET}`);
  return `${payload}.${sig}`;
}

async function verifyToken(token) {
  if (!token) return false;
  const [iat, exp, sig] = token.split(".");
  if (!iat || !exp || !sig) return false;
  const want = await sha256Hex(`${iat}.${exp}.${SECRET}`);
  if (want !== sig) return false;
  const now = Math.floor(Date.now() / 1000);
  return now < Number(exp);
}

function readCookie(req) {
  const raw = req.headers.get("cookie") || "";
  const map = new Map(
    raw.split(/;\s*/).map((p) => {
      const i = p.indexOf("=");
      return i > -1 ? [p.slice(0, i), p.slice(i + 1)] : ["", ""];
    })
  );
  return map.get(COOKIE);
}

// ---------- Handlers ----------
export async function onRequestPost(context) {
  const { request } = context;
  if (!SECRET) return json(500, { ok: false, error: "Missing ADMIN_SECRET" });

  const { password } = await parseBody(request);
  if (!password) return json(400, { ok: false, error: "Missing password" });

  if (password !== SECRET) return json(400, { ok: false, error: "Wrong password" });

  const token = await makeToken();
  const headers = new Headers();
  setCookie(headers, token, TOKEN_TTL);

  // redirect tới /admin/index.html sau khi login
  headers.set("location", "/admin/index.html");
  return new Response(null, { status: 302, headers });
}

export async function onRequestGet(context) {
  // route nhỏ:
  //  /.netlify/functions/admin-auth/ping        -> check secret tồn tại
  //  /.netlify/functions/admin-auth/status      -> {ok, valid}
  //  /.netlify/functions/admin-auth/logout      -> clear cookie
  //  /admin/guard                               -> (proxy) bảo vệ trang admin
  const { request } = context;
  const url = new URL(request.url);

  if (url.pathname.endsWith("/ping")) {
    return json(200, { ok: true, hasSecret: Boolean(SECRET) });
  }

  if (url.pathname.endsWith("/status")) {
    const t = readCookie(request);
    const valid = await verifyToken(t);
    return json(200, { ok: true, valid });
  }

  if (url.pathname.endsWith("/logout")) {
    const h = new Headers();
    clearCookie(h);
    h.set("location", "/admin/login.html");
    return new Response(null, { status: 302, headers: h });
  }

  // Guard: dùng trong /admin/index.html bằng fetch trước khi render (tuỳ bạn)
  if (url.pathname.endsWith("/guard")) {
    const t = readCookie(request);
    const valid = await verifyToken(t);
    if (!valid) return json(401, { ok: false, error: "Unauthorized" });
    return json(200, { ok: true });
  }

  return json(404, { ok: false, error: "Not found" });
}
