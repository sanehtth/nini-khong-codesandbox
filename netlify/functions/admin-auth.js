// NOTE: BLOCK START – Netlify Function admin-auth
// Chức năng: nhận {secret}, đối chiếu biến môi trường ADMIN_SECRET,
// nếu đúng -> set cookie nini_admin=1 (tồn tại 6 giờ) và trả {ok:true}

const baseHeaders = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store'
};

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers: baseHeaders,
        body: JSON.stringify({ ok: false, msg: 'Method Not Allowed' })
      };
    }

    const { secret } = JSON.parse(event.body || '{}');

    // Chấp nhận cả ADMIN_SECRET và admin_secret cho linh hoạt
    const ADMIN = process.env.ADMIN_SECRET || process.env.admin_secret || '';
    const ok = ADMIN && secret && secret === ADMIN;

    if (!ok) {
      return {
        statusCode: 401,
        headers: baseHeaders,
        body: JSON.stringify({ ok: false, msg: 'Sai mật khẩu' })
      };
    }

    // Set cookie 6 giờ – Path=/ để mọi trang đọc được; Secure vì HTTPS; SameSite=Lax là đủ
    const cookie = [
      'nini_admin=1',
      'Max-Age=21600',   // 6h
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      'Secure'
    ].join('; ');

    return {
      statusCode: 200,
      headers: { ...baseHeaders, 'Set-Cookie': cookie },
      body: JSON.stringify({ ok: true })
    };

  } catch (e) {
    return {
      statusCode: 500,
      headers: baseHeaders,
      body: JSON.stringify({ ok: false, msg: 'Server error' })
    };
  }
};
// NOTE: BLOCK END – Netlify Function admin-auth
// NOTE: Admin auth function – nhận {secret}, so khớp ADMIN_SECRET,
// nếu đúng -> set cookie nini_admin=1 (6 giờ) với Domain động.
// --------- START ---------
const baseHeaders = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, headers: baseHeaders, body: JSON.stringify({ ok:false, msg:'Method Not Allowed' }) };
    }

    const { secret } = JSON.parse(event.body || '{}');
    const ADMIN = process.env.ADMIN_SECRET || process.env.admin_secret || '';
    if (!ADMIN || !secret || secret !== ADMIN) {
      return { statusCode: 401, headers: baseHeaders, body: JSON.stringify({ ok:false, msg:'Sai mật khẩu' }) };
    }

    // Xác định domain hiện tại (apex), để cookie dùng cho cả www. và non-www.
    const host = (event.headers['x-forwarded-host'] || event.headers.host || '').split(':')[0] || '';
    const apex = host.replace(/^www\./, '');               // ví dụ: nini-funny.com
    const domainAttr = apex ? `Domain=.${apex}; ` : '';    // Domain=.nini-funny.com;

    const cookie = [
      'nini_admin=1',
      'Max-Age=21600',          // 6 giờ
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      'Secure',
      domainAttr.trim()         // thêm Domain nếu có
    ].filter(Boolean).join('; ');

    return {
      statusCode: 200,
      headers: { ...baseHeaders, 'Set-Cookie': cookie },
      body: JSON.stringify({ ok:true })
    };
  } catch (e) {
    return { statusCode: 500, headers: baseHeaders, body: JSON.stringify({ ok:false, msg:'Server error' }) };
  }
};
// --------- END ----------

