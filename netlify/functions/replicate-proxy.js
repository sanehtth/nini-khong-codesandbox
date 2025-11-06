// netlify/functions/replicate-proxy.js
const ALLOW_ORIGIN = "https://nini-funny.com"; // hoặc "*" nếu bạn cần thử nhanh

const cors = {
  "Access-Control-Allow-Origin": ALLOW_ORIGIN,
  "Access-Control-Allow-Methods": "POST,GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

exports.handler = async (event) => {
  // preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: cors };
  }

  try {
    if (!process.env.REPLICATE_API_TOKEN) {
      return { statusCode: 500, headers: cors, body: JSON.stringify({ ok:false, error:"Missing REPLICATE_API_TOKEN" }) };
    }

    const body = JSON.parse(event.body || "{}");
    // body nên gồm { model, prompt, ... } tuỳ luồng bạn dùng
    const payload = {
      model: body.model || "black-forest-labs/flux-1.1-pro",
      input: { prompt: body.prompt, ...body.input },
    };

    // 1) Tạo prediction
    const r = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await r.json();

    // 2) (tuỳ bạn) Có thể poll tiếp tại /v1/predictions/:id trong client qua function khác,
    // hoặc trả thẳng data để client tự poll bằng function GET dưới đây.
    return { statusCode: r.status, headers: cors, body: JSON.stringify(data) };
  } catch (e) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ ok:false, error: e.message }) };
  }
};
