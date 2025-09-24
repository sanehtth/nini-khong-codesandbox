// netlify/functions/sb-github-save.js
// POST body: { path, content, message?, sha? , buildHook?: true }
// - path: "public/content/storybook/B001.json"
// - content: string (nội dung JSON pretty hoặc raw) -> sẽ base64 khi gửi GitHub
// - sha: nếu cập nhật file đã có, truyền sha để GitHub biết là update (không phải create)
// Auth: cookie admin (đang có sẵn hệ thống của bạn) hoặc header: x-admin-secret
export const config = { path: "/.netlify/functions/sb-github-save" };

import crypto from "node:crypto";

const GH = {
  token: process.env.GITHUB_TOKEN,
  owner: process.env.GITHUB_OWNER,
  repo:  process.env.GITHUB_REPO,
  branch:process.env.GITHUB_BRANCH || "main",
};
const ADMIN_SECRET = process.env.ADMIN_SECRET || "";
const BUILD_HOOK = process.env.NETLIFY_BUILD_HOOK_URL || "";

const json = (s,d,h={}) => new Response(JSON.stringify(d),{status:s,headers:{"content-type":"application/json; charset=utf-8",...h}});
const bad  = (m) => json(400,{ok:false,error:m||"bad request"});
const una  = (m) => json(401,{ok:false,error:m||"unauthorized"});
const oops = (m) => json(500,{ok:false,error:m||"server error"});

function fromCookies(cookie, key) {
  if (!cookie) return "";
  const m = cookie.split(/;\s*/).map(s=>s.split("=")).find(([k])=>k===key);
  return m ? decodeURIComponent(m[1] || "") : "";
}
function verifyCookie(req){
  // Cho phép 2 kiểu: header x-admin-secret hoặc cookie nini_admin + nini_sig
  const hdr = req.headers.get("x-admin-secret");
  if (hdr && ADMIN_SECRET && hdr === ADMIN_SECRET) return true;

  const raw = req.headers.get("cookie") || "";
  const payload = fromCookies(raw, "nini_admin");
  const sig     = fromCookies(raw, "nini_sig");
  if (!payload || !sig || !ADMIN_SECRET) return false;

  const mac = crypto.createHmac("sha256", ADMIN_SECRET).update(payload).digest("hex");
  try{
    const ab = Buffer.from(mac); const bb = Buffer.from(sig);
    return ab.length===bb.length && crypto.timingSafeEqual(ab,bb);
  }catch{ return false; }
}

export default async (req) => {
  try{
    if (req.method !== "POST") return bad("use POST");
    if (!verifyCookie(req)) return una();

    const { path, content, message, sha, buildHook } = await req.json();
    if (!path || typeof content !== "string") return bad("missing path/content");

    const api = `https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/${encodeURIComponent(path)}`;
    const payload = {
      message: message || `chore(storybook): update ${path}`,
      content: Buffer.from(content, "utf8").toString("base64"),
      branch: GH.branch
    };
    if (sha) payload.sha = sha;

    const res = await fetch(api, {
      method: "PUT",
      headers: {
        authorization: `Bearer ${GH.token}`,
        "user-agent": "nini-sb",
        "content-type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) return json(res.status, { ok:false, error: data?.message || "GitHub error", details:data });

    // (tuỳ chọn) kích hoạt build hook để Netlify redeploy -> site tĩnh lấy file mới
    if (buildHook && BUILD_HOOK) {
      try{ await fetch(BUILD_HOOK, { method:"POST" }); }catch(_){}
    }

    return json(200, { ok:true, content: data.content, commit: data.commit });
  }catch(e){
    return oops(e.message);
  }
};
