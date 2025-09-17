// netlify/functions/admin-logout.js
exports.handler = async () => ({
  statusCode: 200,
  headers: {
    "Set-Cookie":
      "admin_auth=; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT"
  },
  body: "ok"
});
