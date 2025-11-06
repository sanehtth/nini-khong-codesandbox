const ALLOW_ORIGIN = "https://nini-funny.com";
const cors = {
  "Access-Control-Allow-Origin": ALLOW_ORIGIN,
  "Access-Control-Allow-Methods": "POST,GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: cors };
  }

  try {
    // --- lấy & làm sạch token ---
    let token = (process.env.REPLICATE_API_TOKEN || "").trim();
    token = token.replace(/^Bearer\s+/i, "").replace(/^Token\s+/i, "");
    // trong replicate-proxy.js, ngay sau khi lấy token & strip:
    const masked = token ? token.slice(0,3) + "***" + token.slice(-3) : "(empty)";
    console.log("[replicate-proxy] token prefix:", token.slice(0,3)); // sẽ là 'r8_'

    if (!/^r\d?_[A-Za-z0-9]+$/.test(token)) { 
      // báo rõ để bạn biết env đang sai định dạng
      return {
        statusCode: 500,
        headers: cors,
        body: JSON.stringify({
          ok: false,
          error: "Invalid REPLICATE_API_TOKEN format (expect r8_...)",
        }),
      };
    }

    const body = JSON.parse(event.body || "{}");
    const modelId = body.model || "black-forest-labs/flux-1.1-pro";
    const payload = { model: modelId, input: body.input || {} };

    const r = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${token}`, // Replicate dùng 'Token', không phải Bearer
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const text = await r.text(); // trả thẳng body để debug khi lỗi
    return { statusCode: r.status, headers: cors, body: text };
  } catch (e) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ ok:false, error: e.message }) };
  }
};


