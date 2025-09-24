// netlify/functions/admin-auth.js

export async function handler(event, context) {
  try {
    const path = (event.path || '').toLowerCase();

    // helper trả JSON nhất quán
    const json = (status, data = {}, headers = {}) => ({
      statusCode: status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        // CORS: cùng origin thì không cần; nếu bạn đăng nhập từ domain khác thì mở:
        // 'Access-Control-Allow-Origin': '*',
        ...headers,
      },
      body: JSON.stringify(data),
    });

    // ===== /ping: health check & env check =====
    if (path.endsWith('/ping')) {
      const hasSecret = !!process.env.ADMIN_SECRET;
      return json(200, { ok: true, hasSecret });
    }

    // ===== /logout: xoá cookie =====
    if (path.endsWith('/logout')) {
      return {
        statusCode: 200,
        headers: {
          'Set-Cookie': 'nini_admin=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify({ ok: true }),
      };
    }

    // ===== /login: xác thực mật khẩu =====
    if (path.endsWith('/login')) {
      if (event.httpMethod !== 'POST') {
        return json(405, { ok: false, msg: 'Method not allowed' });
      }

      // Parse JSON body an toàn
      let body = {};
      try {
        body = JSON.parse(event.body || '{}');
      } catch (e) {
        console.error('JSON parse error', e);
        return json(400, { ok: false, msg: 'Invalid JSON' });
      }

      const pass = (body.pass || '').trim();
      if (!pass) {
        return json(400, { ok: false, msg: 'Missing pass' });
      }

      const secret = (process.env.ADMIN_SECRET || '').trim();
      if (!secret) {
        console.error('ADMIN_SECRET missing');
        return json(500, { ok: false, msg: 'Server not configured' });
      }

      if (pass !== secret) {
        // TODO (tuỳ chọn): rate-limit theo IP khi sai nhiều
        return json(401, { ok: false, msg: 'Unauthorized' });
      }

      // OK: set cookie HttpOnly ~ 6h
      const sixHours = 6 * 60 * 60; // seconds
      return {
        statusCode: 200,
        headers: {
          'Set-Cookie':
            `nini_admin=ok; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${sixHours}`,
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify({ ok: true }),
      };
    }

    // Mặc định: không thấy route
    return json(404, { ok: false, msg: 'Not found' });
  } catch (err) {
    console.error('Function error', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ ok: false, msg: 'Server error' }),
    };
  }
}
