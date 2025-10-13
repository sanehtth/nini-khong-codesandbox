/* auth-glue.js — State flag + cache + đồng bộ Header
   - Flag mặc định = 0 (guest). Chỉ set = 1 khi có user hợp lệ từ Firebase.
   - Cache localStorage để trang khác render tức thì trước khi callback Firebase về.
   - DOM-safe: mọi thao tác lên body/header đều đợi DOMContentLoaded.
*/
(function () {
  const N = (window.NINI = window.NINI || {});
  if (N._wiredAuthGlue) return;
  N._wiredAuthGlue = true;

  // ---------- utils ----------
  const LS_AUTH = 'nini.auth';   // '1' | '0'
  const LS_USER = 'nini.user';   // JSON {email, displayName, photoURL}

  const whenReady = (fn) => {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn, { once: true });
  };

  const minUser = (u) => u ? ({
    email: u.email || '',
    displayName: u.displayName || '',
    photoURL: u.photoURL || ''
  }) : null;

  const saveCache = (auth, user) => {
    try {
      localStorage.setItem(LS_AUTH, auth ? '1' : '0');
      if (auth) localStorage.setItem(LS_USER, JSON.stringify(minUser(user)));
      else localStorage.removeItem(LS_USER);
    } catch(_) {}
  };

  const loadCache = () => {
    let auth = false, user = null;
    try {
      auth = localStorage.getItem(LS_AUTH) === '1';
      const raw = localStorage.getItem(LS_USER);
      user = raw ? JSON.parse(raw) : null;
    } catch(_) {}
    return { auth, user };
  };

  const setBodyAuth = (auth) => whenReady(() => {
    if (!document.body) return;
    document.body.dataset.auth = auth ? 'in' : 'out';
    // đồng bộ biến tiện debug
    N.AUTH_STATE = { signedIn: !!auth };
  });

  // ---------- Header toggle (đã có header.js render sẵn) ----------
  function applyHeaderUser(user) {
    whenReady(() => {
      const btnAuth  = document.getElementById('btnAuthOpen'); // “Đăng nhập/Đăng ký”
      const infoBox  = document.getElementById('userInfo');    // div chứa avatar + nick + Đăng xuất
      const nickSpan = document.getElementById('userNick');     // span nick
      const btnProf  = document.getElementById('btnProfile');   // nút avatar
      const btnOut   = document.getElementById('btnSignOut');   // nút Đăng xuất

      const signedIn = !!user;

      // toggle theo flag
      if (btnAuth)  btnAuth.style.display  = signedIn ? 'none' : 'inline-flex';
      if (infoBox)  infoBox.style.display  = signedIn ? 'inline-flex' : 'none';

      if (signedIn) {
        const display = user.displayName || (user.email ? user.email.split('@')[0] : '') || 'NiNi';
        if (nickSpan) nickSpan.textContent = display;

        const letter = (display[0] || 'U').toUpperCase();
        if (btnProf) {
          if (user.photoURL) {
            btnProf.style.setProperty('--ava-bg', `url("${user.photoURL}")`);
          } else {
            btnProf.style.removeProperty('--ava-bg');
          }
          btnProf.setAttribute('data-letter', letter);
        }
      } else {
        if (btnProf) {
          btnProf.style.removeProperty('--ava-bg');
          btnProf.setAttribute('data-letter', 'U');
        }
      }
    });
  }

  // ---------- Gắn handler cho các nút trong header/modal ----------
  whenReady(() => {
    // mở modal
    document.getElementById('btnAuthOpen')?.addEventListener('click', () => {
      N.emit && N.emit('auth:open');
      const m = document.getElementById('authModal');
      if (!m) return;
      m.classList.remove('hidden');
      m.setAttribute('aria-hidden', 'false');
      document.body.classList.add('body-auth-open');
    });

    // đi profile
    document.getElementById('btnProfile')?.addEventListener('click', () => {
      location.href = '/profile.html';
    });

    // đăng xuất
    document.getElementById('btnSignOut')?.addEventListener('click', async () => {
      try { await N.fb?.signOut?.(); } catch(e){ console.error(e); }
    });
  });

  // ---------- Boot: đặt flag/cached UI ngay khi load file ----------
  (function bootFromCache(){
    const { auth, user } = loadCache();
    setBodyAuth(auth);
    applyHeaderUser(user);
  })();

  // ---------- Nguồn sự thật: lắng nghe Firebase để đổi flag thật sự ----------
  try {
    N.fb?.onUserChanged?.((u) => {
      // chỉ ở đây mới set flag = 1 chắc chắn
      const auth = !!u;
      saveCache(auth, u);
      setBodyAuth(auth);
      applyHeaderUser(minUser(u));
      console.log('[NINI] user:', auth ? (u.email || u.displayName) : 'signed out');
    });
  } catch(e){}

  // ---------- Bắt N.emit từ auth-modal (login/signup/reset/google) ----------
  // Login (email/password)
  N.on && N.on('auth:login', async ({ email, password }) => {
    try {
      const fb = N.fb || {};
      const loginFn = fb.loginEmailPass || fb.loginEmailPassword;
      if (!loginFn) throw new Error('Thiếu NINI.fb.loginEmailPass');
      await loginFn(String(email||'').trim().toLowerCase(), String(password||'')); // flag sẽ set qua onUserChanged
      closeModal();
    } catch (err) {
      setMsg('err', err?.message || 'Đăng nhập thất bại');
    }
  });

  // Signup (email-only)
  N.on && N.on('auth:signup', async ({ email }) => {
    try {
      const fb = N.fb || {};
      if (!fb.registerEmailOnly) throw new Error('Thiếu NINI.fb.registerEmailOnly');
      await fb.registerEmailOnly(String(email||'').trim().toLowerCase());
      setMsg('ok', 'Đã gửi email xác minh. Vui lòng kiểm tra hộp thư.');
      closeModal();
    } catch (err) {
      setMsg('err', err?.message || 'Đăng ký thất bại');
    }
  });

  // Reset password
  N.on && N.on('auth:reset', async ({ email }) => {
    try {
      const fb = N.fb || {};
      if (!fb.resetPassword) throw new Error('Thiếu NINI.fb.resetPassword');
      await fb.resetPassword(String(email||'').trim().toLowerCase());
      setMsg('ok', 'Đã gửi link đặt lại mật khẩu. Vui lòng kiểm tra email.');
      closeModal();
    } catch (err) {
      setMsg('err', err?.message || 'Gửi mail thất bại');
    }
  });

  // Google
  N.on && N.on('auth:google', async () => {
    try {
      const fb = N.fb || {};
      if (!fb.loginGoogle) throw new Error('Thiếu NINI.fb.loginGoogle');
      await fb.loginGoogle(); // flag cập nhật qua onUserChanged
      closeModal();
    } catch (err) {
      setMsg('err', err?.message || 'Đăng nhập Google thất bại');
    }
  });

  // ---------- helpers modal message ----------
  function setMsg(type, text) {
    const wrap = document.querySelector('#authModal .auth-box');
    if (!wrap) { if (text) alert(text); return; }
    let msg = wrap.querySelector('.msg');
    if (!msg) { msg = document.createElement('div'); msg.className = 'msg'; wrap.appendChild(msg); }
    msg.className = 'msg ' + (type || '');
    msg.textContent = text || '';
  }
  function closeModal() {
    const m = document.getElementById('authModal');
    if (!m) return;
    m.classList.add('hidden');
    m.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('body-auth-open');
    N.emit && N.emit('auth:close');
  }
})();
