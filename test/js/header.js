/* header.js — render header + toggle theo user */
(function () {
  const N = (window.NINI = window.NINI || {});
  if (N._wiredHeader) return;
  N._wiredHeader = true;

  const $ = (s, r = document) => r.querySelector(s);
  const ready = (fn) =>
    document.readyState !== 'loading'
      ? fn()
      : document.addEventListener('DOMContentLoaded', fn, { once: true });

  function render() {
    const root = $('#nini_header');
    if (!root) return console.warn('[header] thiếu #nini_header');

    root.innerHTML = `
      <div class="nini-header-wrap">
        <a class="site-brand" data-auto-slogan href="/#/home" title="NiNi — Funny">
          <i class="logo-left"></i>
        </a>

        <nav class="nav">
          <a class="nav-link" href="/#/home">Trang chủ</a>
          <a class="nav-link" href="/#/rules">Luật chơi</a>
        </nav>

        <div class="userbox">
          <!-- khách -->
          <button id="btnAuthOpen" class="btn-auth" type="button">Đăng nhập / Đăng ký</button>

          <!-- đã đăng nhập -->
          <div id="userInfo" class="user-info" style="display:none">
            <button id="btnProfile" class="avatar" type="button" title="Hồ sơ"></button>
            <span class="nick" id="userNick"></span>
            <button id="btnSignOut" class="btn-auth" type="button">Đăng xuất</button>
          </div>
        </div>
      </div>
    `;

    // mở modal
    $('#btnAuthOpen')?.addEventListener('click', () => {
      const m = $('#authModal');
      if (m) {
        m.classList.remove('hidden');
        m.setAttribute('aria-hidden', 'false');
        document.body.classList.add('body-auth-open');
      }
      N.emit && N.emit('auth:open');
    });

    // đi tới hồ sơ
    $('#btnProfile')?.addEventListener('click', () => (location.href = '/profile.html'));

    // đăng xuất
    $('#btnSignOut')?.addEventListener('click', async () => {
      try { await N.fb?.logout?.(); } catch (e) { console.error(e); }
    });
  }

  function updateAuthUI(user) {
    const btnAuth = document.getElementById('btnAuthOpen');
    const boxUser = document.getElementById('userInfo');
    const nick = document.getElementById('userNick');
    const ava = document.getElementById('btnProfile');

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

  ready(() => {
    render();
    // subscribe user
    N.fb?.onUserChanged?.((u) => {
      document.body.dataset.auth = u ? 'in' : 'out';
      updateAuthUI(u);
    });
    // trạng thái tức thời
    try { updateAuthUI(N.fb?.currentUser?.() || null); } catch {}
  });
})();
