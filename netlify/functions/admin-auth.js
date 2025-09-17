// netlify/functions/admin-auth.js
exports.handler = async (event) => {
  const { password } = JSON.parse(event.body || "{}");
  if (password !== process.env.ADMIN_SECRET) {
    return { statusCode: 401, body: JSON.stringify({ ok: false }) };
  }

  const hours = parseInt(process.env.ADMIN_TOKEN_TTL || "6", 10);
  const expires = new Date(Date.now() + hours * 3600 * 1000).toUTCString();

  return {
    statusCode: 200,
    headers: {
      "Set-Cookie": `admin_auth=1; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=${expires}`
    },
    body: JSON.stringify({ ok: true })
  };
};
