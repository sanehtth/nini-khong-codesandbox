// Blocks /admin/* unless a valid signed cookie (HMAC) with unexpired exp exists.
// Allows /admin/login.html to load without cookie.

export default async (request, context) => {
  const url = new URL(request.url);

  // Allow the login page itself
  if (url.pathname.endsWith("/login.html")) return context.next();

  const COOKIE_NAME  = Deno.env.get("COOKIE_NAME")  || "nini_admin";
  const ADMIN_SECRET = Deno.env.get("ADMIN_SECRET") || "";

  const cookieHeader = request.headers.get("cookie") || "";
  const token = readCookie(cookieHeader, COOKIE_NAME);
  if (!token) return redirectToLogin(url);

  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return redirectToLogin(url);

  // Verify signature
  const expected = await hmacB64url(ADMIN_SECRET, payloadB64);
  if (!timingSafeEqual(sig, expected)) return redirectToLogin(url);

  // Check expiry
  try {
    const json = JSON.parse(atobUrl(payloadB64));
    const now = Math.floor(Date.now()/1000);
    if (!json.exp || now >= json.exp) return redirectToLogin(url);
  } catch {
    return redirectToLogin(url);
  }

  return context.next();
};

function redirectToLogin(url) {
  return Response.redirect(new URL("/admin/login.html", url), 302);
}

function readCookie(header, name) {
  const m = header.match(new RegExp("(?:^|; )" + name.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&") + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}

function atobUrl(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "=";
  return atob(s);
}

async function hmacB64url(secret, data) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  const b64 = btoa(String.fromCharCode(...new Uint8Array(sigBuf)));
  return b64.replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}

// Constant-time equality
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i=0; i<a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}
