// Netlify Functions (node18)
const resp = (status, data, extraHeaders = {}) => ({
  statusCode: status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    ...extraHeaders,
  },
  body: JSON.stringify(data),
});

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return resp(405, { ok: false, message: 'Method not allowed' });
    }

    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return resp(400, { ok: false, message: 'Invalid JSON body' });
    }

    const input = (body.secret || '').trim();
    const ADMIN_SECRET = process.env.ADMIN_SECRET || '';

    if (!ADMIN_SECRET) {
      return resp(500, { ok: false, message: 'ADMIN_SECRET is not set' });
    }

    if (input !== ADMIN_SECRET) {
      return resp(401, { ok: false, message: 'Unauthorized' });
    }

    const ttlHours = parseInt(process.env.ADMIN_TOKEN_TTL || '6', 10);
    const expires = new Date(Date.now() + ttlHours * 3600 * 1000).toUTCString();

    return resp(
      200,
      { ok: true },
      {
        // tạo cookie đăng nhập admin
        'Set-Cookie': `nf_admin=1; Path=/; HttpOnly; SameSite=Lax; Secure; Expires=${expires}`,
      }
    );
  } catch (e) {
    return resp(500, { ok: false, message: e.message || 'Server error' });
  }
};
