const fetch = require("node-fetch");
const crypto = require("crypto");

exports.handler = async (event) => {
  try {
    const code = new URL(event.rawUrl).searchParams.get("code");
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${process.env.APP_PUBLIC_URL}/.netlify/functions/auth-google-callback`;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type":"application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code, client_id: clientId, client_secret: clientSecret,
        redirect_uri: redirectUri, grant_type: "authorization_code"
      })
    }).then(r=>r.json());

    if(!tokenRes.id_token) throw new Error("No id_token");

    // Parse id_token để lấy email (không verify public key để tối giản demo)
    const payload = JSON.parse(Buffer.from(tokenRes.id_token.split(".")[1], "base64").toString("utf8"));
    const email = payload.email;
    if(!email) throw new Error("No email");

    // set cookie user_auth (7 ngày)
    const exp = Math.floor(Date.now()/1000) + 7*24*3600;
    const p = Buffer.from(JSON.stringify({ sub: email, exp }), "utf8").toString("base64url");
    const sig = crypto.createHmac("sha256", process.env.AUTH_SECRET).update(p).digest("base64url");
    const token = `${p}.${sig}`;
    const expires = new Date(exp*1000).toUTCString();

    return {
      statusCode: 302,
      headers: {
        "Set-Cookie": `user_auth=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=${expires}`,
        Location: "/"
      }
    };
  } catch(e){
    return { statusCode: 302, headers: { Location: "/?login_error=google" } };
  }
};
