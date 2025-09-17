// Kiểm tra OTP + set cookie user_auth
const crypto = require("crypto");

function parseTx(token){
  const [p,sig] = token.split(".");
  const check = crypto.createHmac("sha256", process.env.AUTH_SECRET).update(p).digest("base64url");
  if(check !== sig) throw new Error("Bad signature");
  const json = Buffer.from(p, "base64url").toString("utf8");
  return JSON.parse(json);
}

exports.handler = async (event) => {
  try {
    const { email, code, tx } = JSON.parse(event.body || "{}");
    if(!email || !code || !tx) return { statusCode:400, body: JSON.stringify({ ok:false, msg:"Thiếu dữ liệu" }) };

    const data = parseTx(tx);
    if(data.email !== email) throw new Error("Email khác");
    if(Date.now() > data.exp) throw new Error("OTP hết hạn");
    if(data.code !== code) throw new Error("OTP sai");

    // Tạo user token (7 ngày)
    const exp = Math.floor(Date.now()/1000) + 7*24*3600;
    const payload = Buffer.from(JSON.stringify({ sub: email, exp }), "utf8").toString("base64url");
    const sig = crypto.createHmac("sha256", process.env.AUTH_SECRET).update(payload).digest("base64url");
    const token = `${payload}.${sig}`;
    const expires = new Date(exp*1000).toUTCString();

    return {
      statusCode: 200,
      headers: {
        "Set-Cookie": `user_auth=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=${expires}`
      },
      body: JSON.stringify({ ok:true })
    };
  } catch(e){
    return { statusCode:400, body: JSON.stringify({ ok:false, msg:e.message }) };
  }
};
