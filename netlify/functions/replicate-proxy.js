// netlify/functions/replicate-proxy.js
const ALLOW_ORIGIN = "https://nini-funny.com"; // hoặc "*" nếu bạn cần thử nhanh

const cors = {
  "Access-Control-Allow-Origin": ALLOW_ORIGIN,
  "Access-Control-Allow-Methods": "POST,GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// ... phần đầu giữ nguyên
exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors };

  try {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) {
      return { statusCode: 500, headers: cors, body: JSON.stringify({ ok:false, error:"Missing REPLICATE_API_TOKEN" }) };
    }

    const body = JSON.parse(event.body || "{}");
    const modelId = body.model || "black-forest-labs/flux-1.1-pro";
    const payload = { model: modelId, input: body.input || {} };

    const r = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const text = await r.text(); // đọc thô để thấy thông điệp lỗi của Replicate
    // Trả thẳng status + body từ Replicate (để bạn nhìn được lỗi thật)
    return { statusCode: r.status, headers: cors, body: text };
  } catch (e) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ ok:false, error: e.message }) };
  }
};

