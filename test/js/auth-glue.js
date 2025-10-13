/* =======================================================================
   auth-glue.js — Boot sớm + đồng bộ trạng thái đăng nhập toàn site
   - Đọc/ghi localStorage để giữ flag auth qua các trang (index/profile/…)
   - Đặt body[data-auth] + NINI.user ngay khi load (trước header)
   - Nghe 'nini:auth' và (fallback) fb.onUserChanged để cập nhật UI
   - Bắt event modal: auth:login | auth:signup | auth:reset | auth:google
   ======================================================================= */

(function () {
  const N = (window.NINI = window.NINI || {});
  if (N._wiredAuthGlueFinal) return;
  N._wiredAuthGlueFinal = true;

  /* ---------- 0) HẰNG SỐ & TIỆN ÍCH CƠ BẢN ---------- */
  const LS_AUTH = 'nini.authIn';   // '1' | '0'
  const LS_USER = 'nini.user';     // {uid,email,displayName,photoURL}

  const FB = () => (window.NINI && window.NINI.fb) || {};
  const $  = (s, r = document) => r.querySelector(s);

  function miniUser(u) {
    return !u ? null : {
      uid: u.uid,
      email: u.email || null,
      displayName: u.displayName || null,
      photoURL: u.photoURL || null,
    };
  }
  function setBodyAuth(inout) {
    document.body.setAttribute('data-auth', inout ? 'in' : 'out');
  }
  function saveCache(user) {
    const authIn = !!user;
    localStorage.setItem(LS_AUTH, authIn ? '1' : '0');
    if (authIn) localStorage.setItem(LS_USER, JSON.stringify(miniUser(user)));
    else        localStorage.removeItem(LS_USER);
    (window.NINI ||= {}).authIn = authIn;
    (window.NINI ||= {}).user   = authIn ? miniUser(user) : null;
    setBodyAuth(authIn);
  }
  function loadCache() {
    const authIn = localStorage.getItem(LS_AUTH) === '1';
    let user = null;
    try { user = JSON.parse(localStorage.getItem(LS_USER) || 'null'); } catch {}
    (window.NINI ||= {}).authIn = authIn;
    (window.NINI ||= {}).user   = user;
    setBodyAuth(authIn);
    return { authIn, user };
  }

  // BOOT SỚM: áp flag & cache ngay khi file được load
  loadCache();

  /* ---------- 1) HEADER: Toggle theo user (không tạo nút mới) ---------- */
  function applyHeaderUser(user) {
    // Các id ở header mới:
    // - #btnAuthOpen (guest)
    // - #userInfo (auth)
    // - #btnProfile (avatar button)
    // - #userNick (nickname)
    // - #btnSignOut (logout)
    const btnAuth = $('#btnAuthOpen');
    const boxUser = $('#userInfo');
    const avaBtn  = $('#btnProfile');
    const nick    = $('#userNick');

    const authIn = !!user;
    setBodyAuth(authIn);

    if (btnAuth) btnAuth.style.display = authIn ? 'none' : 'inline-flex';
    if (boxUser) boxUser.style.display = authIn ? 'inline-flex' : 'none';

    if (authIn) {
      const display = user.displayName || (user.email ? user.email.split('@')[0] : '') || 'NiNi';
      if (nick) nick.textContent = display;
      const letter = display.trim()[0]?.toUpperCase?.() || 'U';
      if (avaBtn) {
        if (user.photoURL) avaBtn.style.setProperty('--ava-bg', `url("${user.photoURL}")`);
        else               avaBtn.style.removeProperty('--ava-bg');
        avaBtn.setAttribute('data-letter', letter);
      }
    } else {
      if (nick) nick.textContent = '';
      if (avaBtn) {
        avaBtn.style.removeProperty('--ava-bg');
        avaBtn.setAttribute('data-letter', 'U');
      }
    }
  }

  // Gắn click logout (nếu có sẵn trong header)
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('#btnSignOut');
    if (!btn) return;
    e.preventDefault();
    try {
      await (FB().doSignOut?.() || FB().signOut?.());
      // onAuthStateChanged / nini:auth sẽ tự cập nhật UI + cache
    } catch (err) {
      console.error('[auth] signOut error:', err);
      alert((err && err.message) || 'Đăng xuất thất bại');
    }
  });

  // Gắn click nút mở modal (nếu header đã render)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('#btnAuthOpen');
    if (!btn) return;
    const m = document.getElementById('authModal');
    if (m) {
      m.classList.remove('hidden');
      m.setAttribute('aria-hidden', 'false');
      document.body.classList.add('body-auth-open');
      N.emit && N.emit('auth:open');
    }
  });

  /* ---------- 2) ĐẦU MỐI SỰ KIỆN AUTH TOÀN SITE ---------- */

  // Nhận sự kiện chuẩn (nếu FB glue có phát)
  document.addEventListener('nini:auth', (e) => {
    const user = e.detail?.user || null;
    saveCache(user);
    applyHeaderUser(user);
  });

  // Fallback: nghe trực tiếp FB (lỡ FB glue chưa phát nini:auth)
  try {
    FB().onUserChanged && FB().onUserChanged((u) => {
      // Phát lại nini:auth để các nơi khác (nếu có) cùng bắt
      document.dispatchEvent(new CustomEvent('nini:auth', { detail: { user: u, authIn: !!u } }));
      // và vẫn cập nhật ngay
      saveCache(u);
      applyHeaderUser(u);
      console.log('[NINI] user:', u ? (u.email || u.uid) : 'signed out');
    });
  } catch (e) { /* ignore */ }

  // Áp cache vào header ngay lần đầu (trước khi FB kịp init)
  applyHeaderUser((window.NINI && window.NINI.user) || null);

  /* ---------- 3) TIỆN ÍCH CHO MODAL ---------- */
  function setMsg(type, text) {
    const wrap = document.querySelector('#authModal .auth-box');
    if (!wrap) { if (text) console.log('[auth msg]', type, text); return; }
    let msg = wrap.querySelector('.msg');
    if (!msg) { msg = document.createElement('div'); msg.className = 'msg'; wrap.appendChild(msg); }
    msg.className = 'msg ' + (type || '');
    msg.textContent = text || '';
  }
  function setFormLoading(formId, loading, textLoading) {
    const form = document.getElementById(formId);
    if (!form) return;
    const btn = form.querySelector('button[type="submit"]');
    if (!btn) return;
    if (loading) {
      btn.dataset._text = btn.textContent;
      btn.textContent = textLoading || 'Đang xử lý...';
      btn.disabled = true;
    } else {
      btn.textContent = btn.dataset._text || btn.textContent;
      btn.disabled = false;
    }
  }
  function closeModal() {
    const m = document.getElementById('authModal');
    if (!m) return;
    m.classList.add('hidden');
    m.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('body-auth-open');
    N.emit && N.emit('auth:close');
  }

  /* ---------- 4) HANDLERS: LOGIN / SIGNUP / RESET / GOOGLE ---------- */

  // Đăng nhập (fallback tự đọc field nếu payload rỗng)
  N.on && N.on('auth:login', async ({ email, password }) => {
    try {
      const modal  = $('#authModal');
      const active = modal ? modal.querySelector('form.active') : null;
      const pick = (selList) => {
        if (!active) return '';
        const el = active.querySelector(selList);
        return el ? String(el.value ?? el.getAttribute('value') ?? '').trim() : '';
      };

      if (!email)    email    = pick('input[type="email"], input[name="email"], input[name*="mail" i]');
      if (!password) password = pick('input[type="password"], input[name="password"]');
      email = (email || '').toLowerCase();

      if (!email) { setMsg('err', 'Thiếu email.'); return; }

      setMsg('', '');
      setFormLoading('formLogin', true, 'Đang đăng nhập...');

      const fb = FB();
      const loginFn = fb.loginEmailPass || fb.loginEmailPassword;
      if (!loginFn) throw new Error('Thiếu NINI.fb.loginEmailPass/LoginEmailPassword');

      const user = await loginFn(email, password);
      setMsg('ok', 'Đăng nhập thành công!');
      closeModal();
      // onAuthStateChanged sẽ bắn nini:auth → lưu cache & cập nhật header
      applyHeaderUser(user); // vẫn update ngay cho mượt
    } catch (err) {
      setMsg('err', (err && err.message) || 'Đăng nhập thất bại');
    } finally {
      setFormLoading('formLogin', false);
    }
  });

  // Đăng ký email-only: tạo user tạm + gửi mail xác minh (mail pro)
  N.on && N.on('auth:signup', async ({ email }) => {
    try {
      const f = $('#authModal #formSignup');
      if (!email && f) {
        const el = f.querySelector('input[type="email"], input[name="email"], input[name*="mail" i]');
        email = el ? String(el.value || '').trim() : '';
      }
      email = (email || '').toLowerCase();
      if (!email) { setMsg('err', 'Vui lòng nhập email.'); return; }

      setMsg('', '');
      setFormLoading('formSignup', true, 'Đang gửi email xác minh...');

      const fb = FB();
      if (!fb.registerEmailOnly) throw new Error('Thiếu NINI.fb.registerEmailOnly');

      await fb.registerEmailOnly(email);
      setMsg('ok', 'Đã gửi email xác minh. Vui lòng kiểm tra hộp thư.');
      closeModal();
    } catch (err) {
      setMsg('err', (err && err.message) || 'Đăng ký thất bại');
    } finally {
      setFormLoading('formSignup', false);
    }
  });

  // Quên mật khẩu
  N.on && N.on('auth:reset', async ({ email }) => {
    try {
      setMsg('', '');
      setFormLoading('formReset', true, 'Đang gửi email...');
      const fb = FB();
      if (!fb.resetPassword) throw new Error('Thiếu NINI.fb.resetPassword');
      await fb.resetPassword(email);
      setMsg('ok', 'Đã gửi link đặt lại mật khẩu. Vui lòng kiểm tra email.');
      closeModal();
    } catch (err) {
      setMsg('err', (err && err.message) || 'Gửi mail thất bại');
    } finally {
      setFormLoading('formReset', false);
    }
  });

  // Google
  N.on && N.on('auth:google', async () => {
    try {
      setMsg('', '');
      const fb = FB();
      if (!fb.loginGoogle) throw new Error('Thiếu NINI.fb.loginGoogle');
      const user = await fb.loginGoogle();
      setMsg('ok', 'Đăng nhập Google thành công!');
      closeModal();
      applyHeaderUser(user);
      // onAuthStateChanged sẽ vẫn phát nini:auth
    } catch (err) {
      setMsg('err', (err && err.message) || 'Đăng nhập Google thất bại');
    }
  });

})();
