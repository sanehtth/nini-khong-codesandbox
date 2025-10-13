/* auth-glue.js — glue giữa modal & backend (Firebase/server)
   - Cache/flag vào localStorage để boot UI không nhấp nháy
   - Đồng bộ body[data-auth] + header khi user đổi
   - Đồng bộ giữa các tab (storage event)
   - Handlers: login / signup / reset / google / logout
*/
(function () {
  const N = (window.NINI = window.NINI || {});
  if (N._wiredAuthGlue) return;
  N._wiredAuthGlue = true;

  /* ====================== STATE / CACHE ======================= */
  const LS_AUTH = 'nini.auth';   // '1' | (null)
  const LS_USER = 'nini.user';   // JSON {email, displayName, photoURL}

  const FB = () => (window.NINI && window.NINI.fb) || {};

  function setBodyAuth(isIn) {
    document.body.setAttribute('data-auth', isIn ? 'in' : 'out');
  }
  function saveCache(u) {
    if (u) {
      localStorage.setItem(LS_AUTH, '1');
      localStorage.setItem(LS_USER, JSON.stringify({
        email: u.email || '',
        displayName: u.displayName || '',
        photoURL: u.photoURL || ''
      }));
    } else {
      localStorage.removeItem(LS_AUTH);
      localStorage.removeItem(LS_USER);
    }
  }
  function loadCache() {
    if (localStorage.getItem(LS_AUTH) !== '1') return null;
    try { return JSON.parse(localStorage.getItem(LS_USER) || 'null'); }
    catch { return null; }
  }

  function renderUserState(user) {
    const loginBtn  = document.querySelector('#btnAuthOpen,[data-auth="open"]');
    const logoutBtn = document.querySelector('#btnLogout,[data-auth="logout"]');
    const avatarBox = document.querySelector('#userAvatar,[data-auth="avatar"]');

    if (user) {
      loginBtn && (loginBtn.style.display = 'none');
      logoutBtn && (logoutBtn.style.display = '');
      // nếu header.js đã render avatar riêng thì bỏ qua avatarBox
      if (avatarBox) {
        avatarBox.innerHTML = '';
        if (user.photoURL) {
          const img = new Image();
          img.src = user.photoURL; img.alt = user.displayName || user.email || 'avatar';
          img.style.cssText='width:28px;height:28px;border-radius:50%;object-fit:cover;';
          avatarBox.appendChild(img);
        } else {
          const dot = document.createElement('div');
          const name = (user.displayName || user.email || '').trim();
          const ch = (name[0] || 'U').toUpperCase();
          dot.textContent = ch;
          dot.style.cssText='width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:#ececff;color:#4b47ff;font-weight:700;';
          avatarBox.appendChild(dot);
        }
        const span = document.createElement('span');
        span.textContent = user.displayName || user.email || '';
        span.style.fontSize = '13px';
        avatarBox.appendChild(span);
      }
    } else {
      loginBtn && (loginBtn.style.display = '');
      logoutBtn && (logoutBtn.style.display = 'none');
      avatarBox && (avatarBox.innerHTML = '');
    }
  }

  /* Boot từ cache để UI đúng ngay khi mở trang */
  const cached = loadCache();
  setBodyAuth(!!cached);
  renderUserState(cached);

  /* Subscribe Firebase */
  try {
    FB().onUserChanged && FB().onUserChanged((u) => {
      saveCache(u);
      setBodyAuth(!!u);
      renderUserState(u);
      N.emit && N.emit('auth:state', !!u);
      console.log('[NINI] user:', u ? u.email : 'signed out');
    });
  } catch {} 

  /* Sync giữa tab */
  window.addEventListener('storage', (e) => {
    if (e.key === LS_AUTH || e.key === LS_USER) {
      const u = loadCache();
      setBodyAuth(!!u);
      renderUserState(u);
      N.emit && N.emit('auth:state', !!u);
    }
  });

  /* =============== Modal helpers (message/loading/close) =============== */
  function setMsg(type, text) {
    const wrap = document.querySelector("#authModal .auth-box");
    if (!wrap) { if (text) alert(text); return; }
    let msg = wrap.querySelector(".msg");
    if (!msg) { msg = document.createElement("div"); msg.className = "msg"; wrap.appendChild(msg); }
    msg.className = "msg " + (type || "");
    msg.textContent = text || "";
  }
  function setFormLoading(formId, loading, textLoading) {
    const form = document.getElementById(formId);
    if (!form) return;
    const btn = form.querySelector('button[type="submit"]');
    if (!btn) return;
    if (loading) {
      btn.dataset._text = btn.textContent;
      btn.textContent = textLoading || "Đang xử lý...";
      btn.disabled = true;
    } else {
      btn.textContent = btn.dataset._text || btn.textContent;
      btn.disabled = false;
    }
  }
  function closeModal() {
    const m = document.getElementById("authModal");
    if (!m) return;
    m.classList.add("hidden");
    m.setAttribute("aria-hidden", "true");
    document.body.classList.remove("body-auth-open");
    N.emit && N.emit("auth:close");
  }

  /* ====================== Handlers modal ======================= */
  // Đăng nhập (email+pass)
  N.on && N.on('auth:login', async ({ email, password }) => {
    try {
      // fallback đọc form
      const modal = document.getElementById('authModal');
      const active = modal ? modal.querySelector('form.active') : null;
      const pick = (sel) => active?.querySelector(sel)?.value?.trim() || '';
      email = (email || pick('input[type="email"],input[name="email"],input[name*="mail" i]') || '').toLowerCase();
      password = password || pick('input[type="password"],input[name="password"]');
      if (!email) { setMsg('err','Thiếu email'); return; }

      setMsg('', ''); setFormLoading('formLogin', true, 'Đang đăng nhập...');
      const fb = FB();
      const loginFn = fb.loginEmailPass || fb.loginEmailPassword;
      if (!loginFn) throw new Error('Thiếu NINI.fb.loginEmailPass/LoginEmailPassword');

      const user = await loginFn(email, password);
      setMsg('ok','Đăng nhập thành công!'); closeModal();
      // UI sẽ được onUserChanged bắn; vẫn set ngay để mượt
      saveCache(user); setBodyAuth(!!user); renderUserState(user);
    } catch (err) {
      setMsg('err', err?.message || 'Đăng nhập thất bại');
    } finally {
      setFormLoading('formLogin', false);
    }
  });

  // Đăng ký email-only
  N.on && N.on('auth:signup', async ({ email }) => {
    try {
      const f = document.getElementById('formSignup');
      const pickEmail = () => f?.querySelector('input[type="email"],input[name="email"],input[name*="mail" i]')?.value?.trim() || '';
      email = (email || pickEmail() || '').toLowerCase();
      if (!email) { setMsg('err','Vui lòng nhập email.'); return; }

      setMsg('', ''); setFormLoading('formSignup', true, 'Đang gửi email xác minh...');
      const fb = FB();
      if (!fb.registerEmailOnly) throw new Error('Thiếu NINI.fb.registerEmailOnly');
      await fb.registerEmailOnly(email);
      setMsg('ok','Đã gửi email xác minh. Vui lòng kiểm tra hộp thư.'); closeModal();
    } catch (err) {
      setMsg('err', err?.message || 'Đăng ký thất bại');
    } finally {
      setFormLoading('formSignup', false);
    }
  });

  // Quên mật khẩu
  N.on && N.on('auth:reset', async ({ email }) => {
    try {
      setMsg('', ''); setFormLoading('formReset', true, 'Đang gửi email...');
      const fb = FB();
      if (!fb.resetPassword) throw new Error('Thiếu NINI.fb.resetPassword');
      await fb.resetPassword(email);
      setMsg('ok','Đã gửi link đặt lại mật khẩu'); closeModal();
    } catch (err) {
      setMsg('err', err?.message || 'Gửi mail thất bại');
    } finally {
      setFormLoading('formReset', false);
    }
  });

  // Google
  N.on && N.on('auth:google', async () => {
    try {
      setMsg('', '');
      const user = await (FB().loginGoogle?.());
      setMsg('ok','Đăng nhập Google thành công!'); closeModal();
      saveCache(user); setBodyAuth(!!user); renderUserState(user);
    } catch (err) {
      setMsg('err', err?.message || 'Đăng nhập Google thất bại');
    }
  });

  /* ====================== Logout (ủy quyền click) ======================= */
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('#btnLogout,[data-auth="logout"]');
    if (!btn) return;
    e.preventDefault();
    try {
      const fb = FB();
      const fn = fb.logout || fb.signOut;
      if (!fn) throw new Error('Thiếu NINI.fb.logout/signOut');
      await fn();
      saveCache(null); setBodyAuth(0); renderUserState(null);
      N.emit && N.emit('auth:state', false);
    } catch (err) { console.error(err); }
  });
})();
