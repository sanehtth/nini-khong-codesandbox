/* header.js — render 1 lần + toggle theo user */
(function () {
  const N = (window.NINI = window.NINI || {});
  if (N._wiredHeader) return; N._wiredHeader = true;

  const $ = (s, r = document) => r.querySelector(s);

  function render() {
    const root = document.getElementById('nini_header');
    if (!root) return;

    root.innerHTML = `
      <div class="nini-header-wrap">
        <a class="brand" href="/#/home" title="NiNi — Funny" style="display:inline-flex;align-items:center;gap:8px;text-decoration:none;color:#fff">
          <span class="logo" style="width:56px;height:28px;display:inline-block;background:url('/public/assets/icons/logo_text.webp') left center/contain no-repeat;"></span>
          <span class="slogan" style="opacity:.85;text-shadow:0 1px 2px rgba(0,0,0,.55)">chơi mê ly, bứt phá tư duy</span>
        </a>

        <nav class="nav" style="display:flex;gap:10px">
          <a class="nav-link" href="/#/home">Trang chủ</a>
          <a class="nav-link" href="/#/rules">Luật chơi</a>
        </nav>

        <div class="userbox" style="display:flex;gap:10px;align-items:center;justify-self:end">
          <button id="btnAuthOpen" class="btn-auth" type="button">Đăng nhập / Đăng ký</button>
          <div id="userInfo" class="user-info" style="display:none;align-items:center;gap:10px">
            <button id="btnProfile" class="avatar" type="button" title="Hồ sơ"
              style="width:28px;height:28px;border-radius:50%;border:1px solid rgba(255,255,255,.6);background:#2e7d32;color:#fff;font-weight:700;display:grid;place-items:center"></button>
            <span id="userNick" class="nick"></span>
            <button id="btnSignOut" class="btn-auth" type="button">Đăng xuất</button>
          </div>
        </div>
      </div>
    `;

    // Nút mở modal
    $('#btnAuthOpen')?.addEventListener('click', () => {
      N.emit && N.emit('auth:open');
      const m = document.getElementById('authModal');
      if (m) {
        m.classList.remove('hidden');
        m.setAttribute('aria-hidden', 'false');
        document.body.classList.add('body-auth-open');
      }
    });

    // Avatar → profile
    $('#btnProfile')?.addEventListener('click', () => { location.href = '/profile.html'; });

    // Đăng xuất
    $('#btnSignOut')?.addEventListener('click', async () => {
      try { await N.fb?.signOut?.(); } catch (e) { console.error(e); }
    });
  }

  function updateAuthUI(user) {
    const btnAuth = document.getElementById('btnAuthOpen');
    const boxUser = document.getElementById('userInfo');
    const nick = document.getElementById('userNick');
    const ava = document.getElementById('btnProfile');

    if (user) {
      document.body.dataset.auth = 'in';
      btnAuth && (btnAuth.style.display = 'none');
      boxUser && (boxUser.style.display = 'inline-flex');

      const display = user.displayName || (user.email ? user.email.split('@')[0] : 'NiNi');
      if (nick) nick.textContent = display;

      const letter = (display || 'U').trim()[0].toUpperCase();
      if (ava) {
        // Nếu có ảnh
        if (user.photoURL) {
          ava.style.background = `url('${user.photoURL}') center/cover no-repeat`;
          ava.textContent = '';
        } else {
          ava.style.background = '#2e7d32';
          ava.textContent = letter;
        }
      }
    } else {
      document.body.dataset.auth = 'out';
      boxUser && (boxUser.style.display = 'none');
      btnAuth && (btnAuth.style.display = 'inline-flex');
    }
  }

  function wire() {
    render();
    // Subscribe 1 lần
    if (N.fb?.onUserChanged) N.fb.onUserChanged(updateAuthUI);
    // Cập nhật ngay nếu đã có user
    try { updateAuthUI(N.fb?.currentUser?.() || null); } catch (_) {}
  }

  // chống nạp 2 lần
  document.addEventListener('DOMContentLoaded', wire, { once: true });
})();
