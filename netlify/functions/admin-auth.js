export const handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }
    const { secret } = JSON.parse(event.body || '{}');
    if (!secret || secret !== process.env.ADMIN_SECRET) {
      return { statusCode: 401, body: 'Unauthorized' };
    }

    const ttl = parseInt(process.env.ADMIN_TOKEN_TTL || '21600', 10); // 6h
    const exp = Math.floor(Date.now() / 1000) + ttl;

    // token đơn giản (đủ cho guard cookie)
    const token = Buffer.from(JSON.stringify({ sub: 'admin', exp }))
      .toString('base64url');

    const cookie = [
      `nf_admin=${token}`,
      'Path=/', 'HttpOnly', 'Secure', 'SameSite=Lax',
      `Max-Age=${ttl}`
    ].join('; ');

    return {
      statusCode: 200,
      headers: { 'Set-Cookie': cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true })
    };
  } catch (e) {
    return { statusCode: 500, body: 'Server error' };
  }
};
