/** =======================================================================
 * NiNi — Admin Auth (Netlify Function, single-file)
 * Endpoints:
 *   POST  /.netlify/functions/admin-auth/login
 *   GET   /.netlify/functions/admin-auth/check
 *   POST  /.netlify/functions/admin-auth/refresh
 *   POST  /.netlify/functions/admin-auth/logout
 *
 * Biến môi trường yêu cầu:
 *   - ADMIN_SECRET   (mật khẩu admin, trùng cái bạn đang dùng)
 *   - ADMIN_SESSION_TTL_MIN   (tuỳ chọn, mặc định 360 = 6h)
 *   - ADMIN_REFRESH_TTL_HOUR  (tuỳ chọn, mặc định 72h)
 *
 * Cookie set:
 *   - admin_session   (JWT ngắn hạn, httpOnly, SameSite=Lax)
 *   - admin_refresh   (JWT dài hạn để gia hạn khi session hết)
 * -----------------------------------------------------------------------
 *  NOTE khối: [JWT helpers]
 * =======================================================================*/
const crypto = require("crypto");

const ENC_KEY = process.env.ADMIN_JWT_KEY || crypto.randomBytes(32).toString("hex");
const SESSION_TTL_MIN = parseInt(process.env.ADMIN_SESSION_TTL_MIN || "360", 10); // 6h
const REFRESH_TTL_H  = parseInt(process.env.ADMIN_REFRESH_TTL_HOUR || "72", 10);  // 3 ngày
const ADMIN_SECRET   = process.env.ADMIN_SECRET || process.env.admin_secret || ""; // ← dùng đúng tên bạn

function base64url(buf){ return Buffer.from(buf).toString("base64url"); }
function sign(payload, ttlSec){
  const header = { alg: "HS256", typ: "JWT" };
  const exp = Math.floor(Date.now()/1000) + ttlSec;
  const body = { ...payload, exp };
  const h = base64url(JSON.stringify(header));
  const b = base64url(JSON.stringify(body));
  const data = `${h}.${b}`;
  const sig = crypto.createHmac("sha256", ENC_KEY).update(data).digest("base64url");
  return `${data}.${sig}`;
}
function verify(token){
  try{
    const [h,b,s] = token.split(".");
    const data = `${h}.${b}`;
    const sig = crypto.createHmac("sha256", ENC_KEY).update(data).digest("base64url");
    if(sig !== s) return null;
    const body = JSON.parse(Buffer.from(b,"base64url").toString("utf8"));
    if(!body.exp || body.exp < Math.floor(Date.now()/1000)) return null;
    return body;
  }catch{ return null; }
}

/** =======================================================================
 *  NOTE khối: [Cookie helpers]
 * =======================================================================*/
function setCookie(name, value, attrs={}){
  const parts = [`${name}=${value}`];
  if(attrs.httpOnly) parts.push("HttpOnly");
  if(attrs.sameSite) parts.push(`SameSite=${attrs.sameSite}`);
  if(attrs.secure)   parts.push("Secure");
  if(attrs.path)     parts.push(`Path=${attrs.path}`);
  if(attrs.maxAge!=null) parts.push(`Max-Age=${attrs.maxAge}`);
  return parts.join("; ");
}
function parseCookies(raw=""){
  const out = {};
  raw.split(";").forEach(p=>{
    const i = p.indexOf("="); if(i<0) return;
    const k = p.slice(0,i).trim(); const v = p.slice(i+1).trim();
    out[k] = v;
  });
  return out;
}

/** =======================================================================
 *  NOTE khối: [HTTP helpers]
 * =======================================================================*/
function json(status, body, extraHeaders={}){
  return {
    statusCode: status,
    headers: { "content-type":"application/json; charset=utf-8", ...extraHeaders },
    body: JSON.stringify(body)
  };
}
function noContent(extraHeaders={}){ return { statusCode: 204, headers: extraHeaders, body: "" }; }

/** =======================================================================
 *  NOTE khối: [Handler router]
 * =======================================================================*/
exports.handler = async (event) => {
  const { httpMethod, path } = event;
  const sub = path.split("/").pop(); // login | check | refresh | logout

  try{
    if(httpMethod === "POST" && sub === "login"){
      // ---- [LOGIN] -------------------------------------------------------
      const { password } = JSON.parse(event.body||"{}");
      if(!password || password !== ADMIN_SECRET){
        return json(401, { ok:false, msg:"Sai mật khẩu." });
      }
      const session = sign({ role:"admin" }, SESSION_TTL_MIN*60);
      const refresh = sign({ role:"admin", kind:"refresh" }, REFRESH_TTL_H*3600);

      const headers = {
        "set-cookie": [
          setCookie("admin_session", session, {
            httpOnly:true, sameSite:"Lax", secure:true, path:"/",
            maxAge: SESSION_TTL_MIN*60
          }),
          setCookie("admin_refresh", refresh, {
            httpOnly:true, sameSite:"Lax", secure:true, path:"/",
            maxAge: REFRESH_TTL_H*3600
          })
        ]
      };
      return json(200, { ok:true }, headers);
    }

    if(httpMethod === "GET" && sub === "check"){
      // ---- [CHECK] -------------------------------------------------------
      const cookies = parseCookies(event.headers.cookie||"");
      const token = cookies.admin_session;
      const ok = token && verify(token);
      return ok ? json(200,{ok:true}) : json(401,{ok:false});
    }

    if(httpMethod === "POST" && sub === "refresh"){
      // ---- [REFRESH] -----------------------------------------------------
      const cookies = parseCookies(event.headers.cookie||"");
      const r = cookies.admin_refresh && verify(cookies.admin_refresh);
      if(!r || r.role!=="admin" || r.kind!=="refresh"){
        return json(401, { ok:false, msg:"Refresh hết hạn" });
      }
      const session = sign({ role:"admin" }, SESSION_TTL_MIN*60);
      const headers = {
        "set-cookie": setCookie("admin_session", session, {
          httpOnly:true, sameSite:"Lax", secure:true, path:"/",
          maxAge: SESSION_TTL_MIN*60
        })
      };
      return json(200, { ok:true }, headers);
    }

    if(httpMethod === "POST" && sub === "logout"){
      // ---- [LOGOUT] ------------------------------------------------------
      const headers = {
        "set-cookie": [
          setCookie("admin_session","",{httpOnly:true,sameSite:"Lax",secure:true,path:"/",maxAge:0}),
          setCookie("admin_refresh","",{httpOnly:true,sameSite:"Lax",secure:true,path:"/",maxAge:0})
        ]
      };
      return noContent(headers);
    }

    // ---- [404]
    return json(404, { ok:false, msg:"Not found" });
  }catch(e){
    return json(500, { ok:false, msg:e.message||"Server error" });
  }
};
