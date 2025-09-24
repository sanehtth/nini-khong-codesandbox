// netlify/functions/admin-auth.js
// NOTE: CommonJS để build ổn định trên Netlify Functions (Node runtime)

// ===== Helpers chung =====
const crypto = require("crypto");

function json(status, data, headers = {}) {
  return {
    statusCode: status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
    body: JSON.stringify(data),
  };
}
function badRequest(msg)   { return json(400, { ok: false, error: msg }); }
function unauthorized(msg) { return json(401, { ok: false, error: msg }); }
function serverError(msg) { return json(500, { ok: false, error: msg }); }

// Parse body an toàn (luôn trả JSON hoặc null)
function parseBody(event) {
  if (!event.body) return null;
  const ctype = (event.headers["content-type"] || "").toLowerCase();
  try {
    if (ctype.includes("application/json")) return JSON.parse(event.body);
  } catch (_) {}
  return null;
}

// ===== Tạo/kiểm tra token HMAC (không cần DB) =====
// payload: { iat, exp }  -> base64url(JSON).signature
function sign(payload, secret) {
  const s = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const h = crypto.createHmac("sha256", secret).update(s).digest("hex");
  return `${s}.${h}`;
}
function verify(token, secret) {
  if (typeof token !== "string") return { ok: false, error: "no token" };
  const dot = token.indexOf(".");
  if (dot <= 0) return { ok: false, error: "format" };
  const body = token.slice(0, dot);
  const sig  = token.slice(dot + 1);
  const sig2 = crypto.createHmac("sha256", secret).update(body).digest("hex");
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(sig2))) {
    return { ok: false, error: "sig" };
  }
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    if (!payload || typeof payload.exp !== "number") {
      return { ok: false, error: "payload" };
    }
    if (Date.now() > payload.exp) return { ok: false, error: "expired" };
    return { ok: true, payload };
  } catch (_) {
    return { ok: false, error: "decode" };
  }
}

// ===== Cookie helpers =====
function setCookie(maxAgeSec = 0, extra = "") {
  const base = [
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    // production là https -> Secure; local dev http thì có thể bỏ
    "Secure",
  ];
  if (maxAgeSec > 0) base.push(`Max-Age=${maxAgeSec}`);
  if (extra) base.push(extra);
  return base.join("; ");
}

// ====== HANDLER CHÍNH ======
exports.handler = async (event) => {
  // NOTE: đặt biến môi trường trong Netlify:
  // ADMIN_SECRET (bắt buộc), ADMIN_TOKEN_TTL (giây, mặc định 21600 = 6h)
  const SECRET = process.env.ADMIN_SECRET || "";
  const TTL    = Math.max(60, parseInt(process.env.ADMIN_TOKEN_TTL || "21600", 10)); // >= 60s
  if (!SECRET) return serverError("Missing ADMIN_SECRET");

  const url = (event.path || "").replace(/\/+$/, ""); // bỏ dấu / cuối nếu có
  const method = (event.httpMethod || "GET").toUpperCase();

  // Lấy cookie từ request
  const rawCookie = event.headers.cookie || event.headers.Cookie || "";
  const cookies = Object.fromEntries(
    rawCookie.split(";").map(s => s.trim()).filter(Boolean).map(s => {
      const i = s.indexOf("="); if (i < 0) return ["", ""];
      return [s.slice(0, i), decodeURIComponent(s.slice(i + 1))];
    })
  );
  const token = cookies["nini_admin"];

  // ===== ROUTES =====

  // 1) Ping: kiểm tra function + biến môi trường
  if (url.endsWith("/admin-auth/ping") && method === "GET") {
    return json(200, { ok: true, hasSecret: !!SECRET });
  }

  // 2) Login: body { password }
  if (url.endsWith("/admin-auth/login") && method === "POST") {
    const body = parseBody(event);
    if (!body || typeof body.password !== "string") {
      return badRequest("Missing password");
    }

    // So sánh với ADMIN_SECRET
    // Bạn có thể thay bằng bcrypt/hash… nếu muốn
    if (body.password !== SECRET) {
      return unauthorized("Wrong password");
    }

    // Tạo token mới
    const now = Date.now();
    const payload = { iat: now, exp: now + TTL * 1000 };
    const newToken = sign(payload, SECRET);

    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
        "set-cookie": `nini_admin=${encodeURIComponent(newToken)}; ${setCookie(TTL)}`,
      },
      body: JSON.stringify({ ok: true, ttl: TTL }),
    };
  }

  // 3) Check: đọc cookie, nếu còn hạn -> ok; nếu hết hạn -> 401
  if (url.endsWith("/admin-auth/check") && method === "GET") {
    if (!token) return unauthorized("No token");
    const v = verify(token, SECRET);
    if (!v.ok) return unauthorized(v.error || "Invalid");
    // (tuỳ chọn) gia hạn “rolling session”: nếu còn < 1/3 TTL thì set lại cookie
    const leftMs = v.payload.exp - Date.now();
    if (leftMs < TTL * 1000 / 3) {
      const now = Date.now();
      const payload = { iat: now, exp: now + TTL * 1000 };
      const refresh = sign(payload, SECRET);
      return {
        statusCode: 200,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store",
          "set-cookie": `nini_admin=${encodeURIComponent(refresh)}; ${setCookie(TTL)}`,
        },
        body: JSON.stringify({ ok: true, refresh: true }),
      };
    }
    return json(200, { ok: true, refresh: false });
  }

  // 4) Logout: xoá cookie
  if (url.endsWith("/admin-auth/logout") && method === "POST") {
    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
        "set-cookie": `nini_admin=; ${setCookie(0)}; Max-Age=0`,
      },
      body: JSON.stringify({ ok: true }),
    };
  }

  // 404 cho route khác
  return json(404, { ok: false, error: "Not found" });
};

/* -------------------- HẾT FILE admin-auth.js -------------------- */
