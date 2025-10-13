/* auth-glue.js — glue modal <-> Firebase; validate email; toggle UI */
(function () {
  const N = (window.NINI = window.NINI || {});
  if (N._wiredAuthGlue) return;
  N._wiredAuthGlue = true;

  const FB = () => (window.NINI && window.NINI.fb) || {};

  // ===== helpers modal
  function setMsg(type, text) {
    const wrap = document.querySelector('#authModal .auth-box');
    if (!wrap) { if (text) alert(text); return; }
    let msg = wrap.querySelector('.msg');
    if (!msg) { msg = document.createElement('div'); msg.className = 'msg'; wrap.appendChild(msg); }
    msg.className = 'msg ' + (type || '');
    msg.textContent = text || '';
  }
  function setFormLoading(formId, loading, text) {
    const form = document.getElementById(formId);
    if (!form) return;
    const btn = form.querySelector('button[type="submit"]');
    if (!btn) return;
    if (loading) {
      btn.dataset._text = btn.textContent;
      btn.textContent = text || 'Đang xử lý...';
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

  // ===== header toggle (chỉ dùng phần tử đã render bởi header.js)
  function renderUserState(user) {
    const btnAuth = document.getElementById('btnAuthOpen');
    const boxUser = document.getElementById('userInfo');
    const nick = document.getElementById('userNick');
    const ava = document.getElementById('btnProfile');

    document.body.dataset.auth = user ? 'in' : 'out';

    if (user) {
      btnAuth && (btnAuth.style.display = 'none');
      boxUser && (boxUser.style.display = 'inline-flex');

      const display = user.displayName || (user.email ? user.email.split('@')[0] : 'NiNi');
      if (nick) nick.textContent = display;

      const letter = display.trim()[0]?.toUpperCase?.() || 'U';
      if (ava) {
        if (user.photoURL) ava.style.setProperty('--ava-bg', `url("${user.photoURL}")`);
        else ava.style.removeProperty('--ava-bg');
        ava.setAttribute('data-letter', letter);
      }
    } else {
      boxUser && (boxUser.style.display = 'none');
      btnAuth && (btnAuth.style.display = 'inline-flex');
      if (ava) { ava.style.removeProperty('--ava-bg'); ava.setAttribute('data-letter', 'U'); }
    }
  }

  // ===== email validator
  function isValidEmail(s) {
    if (!s) return false;
    s = String(s).trim();
    if (s.length > 254) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
  }
  function pickEmailFrom(formId) {
    const f = document.getElementById(formId);
    if (!f) return '';
    const el = f.querySelector('input[type="email"], input[name="email"], input[name*="mail" i]');
    return el ? String(el.value || '').trim().toLowerCase() : '';
  }

  // ===== subscribe user
  try {
    FB().onUserChanged?.((u) => {
      renderUserState(u);
      console.log('[NINI] user:', u ? u.email : 'signed out');
    });
  } catch {}

  // ===== handlers
  N.on && N.on('auth:login', async ({ email, password }) => {
    try {
      if (!email) email = pickEmailFrom('formLogin');
      if (!isValidEmail(email)) { setMsg('err', 'Email không hợp lệ.'); return; }
      setMsg('', ''); setFormLoading('formLogin', true, 'Đang đăng nhập...');
      const fb = FB();
      const loginFn = fb.loginEmailPass || fb.loginEmailPassword;
      if (!loginFn) throw new Error('Thiếu NINI.fb.loginEmailPass/LoginEmailPassword');
      const user = await loginFn(email, password);
      setMsg('ok', 'Đăng nhập thành công!'); closeModal(); renderUserState(user);
    } catch (e) {
      setMsg('err', e?.message || 'Đăng nhập thất bại');
    } finally {
      setFormLoading('formLogin', false);
    }
  });

  N.on && N.on('auth:signup', async ({ email }) => {
    try {
      if (!email) email = pickEmailFrom('formSignup');
      if (!isValidEmail(email)) { setMsg('err', 'Email không hợp lệ.'); return; }
      setMsg('', ''); setFormLoading('formSignup', true, 'Đang gửi email xác minh...');
      const fb = FB();
      if (!fb.registerEmailOnly) throw new Error('Thiếu NINI.fb.registerEmailOnly');
      await fb.registerEmailOnly(email);
      setMsg('ok', 'Đã gửi email xác minh. Vui lòng kiểm tra hộp thư.');
      closeModal();
    } catch (e) {
      setMsg('err', e?.message || 'Đăng ký thất bại');
    } finally {
      setFormLoading('formSignup', false);
    }
  });

  N.on && N.on('auth:reset', async ({ email }) => {
    try {
      if (!email) email = pickEmailFrom('formReset');
      if (!isValidEmail(email)) { setMsg('err', 'Email không hợp lệ.'); return; }
      setMsg('', ''); setFormLoading('formReset', true, 'Đang gửi email...');
      const fb = FB();
      if (!fb.resetPassword) throw new Error('Thiếu NINI.fb.resetPassword');
      await fb.resetPassword(email);
      setMsg('ok', 'Đã gửi link đặt lại mật khẩu.'); closeModal();
    } catch (e) {
      setMsg('err', e?.message || 'Gửi email thất bại');
    } finally {
      setFormLoading('formReset', false);
    }
  });

  N.on && N.on('auth:google', async () => {
    try {
      setMsg('', '');
      const user = await FB().loginGoogle();
      setMsg('ok', 'Đăng nhập Google thành công!'); closeModal(); renderUserState(user);
    } catch (e) {
      setMsg('err', e?.message || 'Đăng nhập Google thất bại');
    }
  });
})();
