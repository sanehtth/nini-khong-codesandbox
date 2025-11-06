// netlify/functions/hf-proxy.js
const ALLOW = "https://nini-funny.com";
const cors = {
  "Access-Control-Allow-Origin": ALLOW,
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors };

  try {
    let token = (process.env.HUGGINGFACE_API_TOKEN || "").trim().replace(/^Bearer\s+/i,"");
    if (!token.startsWith("hf_")) {
      return { statusCode: 500, headers: cors, body: JSON.stringify({ ok:false, error:"Missing/invalid HUGGINGFACE_API_TOKEN (hf_…)" }) };
    }

    const { model, input } = JSON.parse(event.body || "{}");
    if (!model) return { statusCode: 400, headers: cors, body: JSON.stringify({ ok:false, error:"Missing model" }) };

    const r = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(input || {})
    });

    // Inference có thể trả binary; an toàn nhất là pass-through text/json
    const text = await r.text();
    return { statusCode: r.status, headers: { ...cors, "Content-Type":"application/json" }, body: text };
  } catch (e) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ ok:false, error: e.message }) };
  }
};
