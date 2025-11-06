// netlify/functions/replicate-get.js
const ALLOW_ORIGIN = "https://nini-funny.com";
const cors = {
  "Access-Control-Allow-Origin": ALLOW_ORIGIN,
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};
exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors };

  try {
    const id = new URLSearchParams(event.queryStringParameters).get("id");
    const r = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}` }
    });
    const data = await r.json();
    return { statusCode: r.status, headers: cors, body: JSON.stringify(data) };
  } catch (e) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ ok:false, error: e.message }) };
  }
};
