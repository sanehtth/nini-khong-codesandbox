/* Admin auth (Netlify Function, CommonJS)
   - POST   /.netlify/functions/admin-auth/login   {secret}
   - POST   /.netlify/functions/admin-auth/logout
   - GET    /.netlify/functions/admin-auth/check
   - GET    /.netlify/functions/admin-auth/ping
*/
const crypto = require("node:crypto");

// ===== helpers =====
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
function badRequest(msg) { return json(400, { ok: false, error: msg }); }
function unauthorized(msg) { return json(401, { ok: false, error: msg }); }
function internal(msg) { return json(500, { ok: false, error: msg }); }

function parseBody(event) {
  try {
    if (!event.body) return {};
    // Netlify có thể base64 body; nhưng mặc định là string UTF-8
    const isJson = (event.headers["content-type"] || "")
      .toLowerCase()
      .includes("application/json");
    if (!isJson) return {}; // để báo lỗi 400 phía dưới
    return JSON.parse(event.body);
  } catch (_) {
    return {}; // để logic phía dưới trả 400 thay vì 502
  }
}

// ký/kiểm tra token HMAC
function sign(payload, secret) {
  const h = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${h}`;
}
function verify(signed, secret) {
  const i = signed.lastIndexOf(".");
  if (i < 0) return null;
  const payload = signed.slice(0, i);
  const mac = signed.slice(i + 1);
  const mac2 = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  const ok = crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(mac2));
  if (!ok) return null;
  try { return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")); }
  catch { return null; }
}

// cookie helpers
function cookieAttrs(maxAgeSec = 0) {
  // Netlify là https ⇒ nên dùng secure; nếu test local http thì bỏ Secure
  const attrs = [
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Secure",
  ];
  if (maxAgeSec > 0) attrs.push(`Max-Age=${maxAgeSec}`);
  else attrs.push("Max-Age=0");
  return attrs.join("; ");
}
function setCookie(name, value, maxAgeSec) {
  return { "set-cookie": `${name}=${value}; ${cookieAttrs(maxAgeSec)}` };
}
function clearCookie(name) {
  return { "set-cookie": `${name}=; ${cookieAttrs(0)}` };
}

function getCookie(event, name) {
  const raw = event.headers.cookie || event.headers.Cookie || "";
  const m = raw.split(/;\s*/).find(p => p.startsWith(name + "="));
  return m ? decodeURIComponent(m.split("=").slice(1).join("=")) : "";
}

// ===== main handler =====
exports.handler = async (event) => {
  try {
    const ADMIN_SECRET = process.env.ADMIN_SECRET || "";
    const TTL = parseInt(process.env.ADMIN_TOKEN_TTL || "21600", 10); // 6h mặc định
    if (!ADMIN_SECRET) {
      // Không khiến 502 nữa – trả 500 có thông báo
      return internal("Missing ADMIN_SECRET env");
    }

    const [, , , segment] = (event.path || "").split("/"); // .../admin-auth/<segment>
    const method = event.httpMethod || "GET";

    // CORS tối thiểu (nếu bạn gọi từ domain khác)
    if (method === "OPTIONS") {
      return {
        statusCode: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET,POST,OPTIONS",
          "access-control-allow-headers": "content-type",
        },
        body: "",
      };
    }

    if (segment === "ping") {
      return json(200, { ok: true, hasSecret: !!ADMIN_SECRET });
    }

    // ---- /login ----
    if (segment === "login" && method === "POST") {
      const { secret } = parseBody(event);
      if (!secret) return badRequest("Thiếu body JSON {secret} hoặc Content-Type.");
      // so sánh bí mật (constant time)
      const ok = crypto.timingSafeEqual(
        Buffer.from(String(secret)),
        Buffer.from(String(ADMIN_SECRET))
      );
      if (!ok) return unauthorized("Sai mật khẩu.");

      const payload = { iat: Date.now(), exp: Date.now() + TTL * 1000 };
      const b64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
      const token = sign(b64, ADMIN_SECRET);

      return json(
        200,
        { ok: true },
        setCookie("nini_admin", token, TTL)
      );
    }

    // ---- /logout ----
    if (segment === "logout" && method === "POST") {
      return json(200, { ok: true }, clearCookie("nini_admin"));
    }

    // ---- /check ----
    if (segment === "check" && method === "GET") {
      const token = getCookie(event, "nini_admin");
      if (!token) return unauthorized("No token.");
      const data = verify(token, ADMIN_SECRET);
      if (!data) return unauthorized("Bad token.");
      if (Date.now() > data.exp) {
        // hết hạn
        return json(401, { ok: false, error: "Expired" }, clearCookie("nini_admin"));
      }
      return json(200, { ok: true, exp: data.exp });
    }

    // default
    return json(404, { ok: false, error: "Not found" });
  } catch (err) {
    // Bất kỳ lỗi nào cũng trả 500 JSON thay vì rơi 502
    return internal(err && err.message ? err.message : "Internal error");
  }
};
