exports.handler = async () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = `${process.env.APP_PUBLIC_URL}/.netlify/functions/auth-google-callback`;
  const scope = encodeURIComponent("openid email profile");
  const state = "nini_" + Math.random().toString(36).slice(2);

  const url = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${clientId}` +
              `&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${state}&prompt=select_account`;

  return { statusCode: 302, headers: { Location: url } };
};
