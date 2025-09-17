exports.handler = async () => {
  const COOKIE_NAME = process.env.COOKIE_NAME || "nini_admin";
  const cookie = [
    `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
  ].join("; ");
  return { statusCode: 200, headers: { "Set-Cookie": cookie }, body: "OK" };
};
