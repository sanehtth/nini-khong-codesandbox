// netlify/functions/sb-github-get.js
// GET ?path=public/content/storybook/library-manifest.json
// GET ?path=public/content/storybook/B001.json
// (Tùy chọn) ?raw=1 để trả raw content
export const config = { path: "/.netlify/functions/sb-github-get" };

const GH = {
  token: process.env.GITHUB_TOKEN,
  owner: process.env.GITHUB_OWNER,
  repo:  process.env.GITHUB_REPO,
  branch:process.env.GITHUB_BRANCH || "main",
};

const json = (s,d,h={}) => new Response(JSON.stringify(d),{ status:s, headers:{ "content-type":"application/json; charset=utf-8", ...h } });
const bad  = (m) => json(400,{ok:false,error:m||"bad request"});
const oops = (m) => json(500,{ok:false,error:m||"server error"});

export default async (req) => {
  try{
    const url = new URL(req.url);
    const path = url.searchParams.get("path");
    const wantRaw = url.searchParams.get("raw") === "1";
    if (!path) return bad("missing path");

    const api = `https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(GH.branch)}`;
    const res = await fetch(api, { headers:{ authorization: `Bearer ${GH.token}`, "user-agent":"nini-sb" }});
    if (!res.ok) return json(res.status, { ok:false, error: await res.text() });
    const data = await res.json();

    // data.content là base64 nếu là file
    if (wantRaw) {
      if (!data.content) return bad("not a file");
      const raw = Buffer.from(data.content, "base64").toString("utf8");
      return new Response(raw, { status:200, headers:{ "content-type": data.type?.includes("json") ? "application/json" : "text/plain" } });
    }
    return json(200, { ok:true, data });
  }catch(e){
    return oops(e.message);
  }
};
