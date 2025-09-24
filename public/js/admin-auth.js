// /public/js/admin-auth.js
// Gộp và chuẩn hoá kiểm tra + gia hạn phiên Admin

window.AdminAuth = (() => {
  const PATH = {
    login:  '/.netlify/functions/admin-auth',   // POST { password }
    check:  '/.netlify/functions/admin-check',  // GET  -> { ok: true } | { ok:false, reason:'expired' }
    logout: '/.netlify/functions/admin-logout', // GET/POST: clear cookies
  };

  // --- helpers ---
  async function jsonFetch(url, opt={}) {
    const r = await fetch(url, { credentials:'include', ...opt });
    const ct = r.headers.get('content-type') || '';
    const data = ct.includes('application/json') ? await r.json() : {};
    if (!r.ok) throw Object.assign(new Error(data.msg || r.statusText), { data, status:r.status });
    return data;
  }

  // --- API ---
  async function login(password) {
    // trả true/false: không throw để UI dễ hiển thị
    try {
      const res = await jsonFetch(PATH.login, {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ password })
      });
      return !!res.ok;
    } catch(_) { return false; }
  }

  async function check() {
    try {
      const res = await jsonFetch(PATH.check, { method:'GET' });
      return !!res.ok;
    } catch (e) {
      // nếu function trả ok:false; status 401 → coi như false
      return false;
    }
  }

  async function guardPage({ onChecking } = {}) {
    onChecking?.();
    const ok = await check();
    return ok;
  }

  async function logout() {
    try { await jsonFetch(PATH.logout, { method:'POST' }); }
    catch(_) {}
  }

  return { login, check, guardPage, logout };
})();
