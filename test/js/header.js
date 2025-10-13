/* header.js — render an toàn + cleanup legacy + toggle auth UI */
(function () {
  const N = (window.NINI = window.NINI || {});
  if (N._wiredHeader) return;
  N._wiredHeader = true;

  const $ = (s, r = document) => r.querySelector(s);
  const ready = (fn) => (document.readyState !== 'loading' ? fn() : document.addEventListener('DOMContentLoaded', fn));

  function render() {
    const root = document.getElementById('nini_header');
    if (!root) { console.warn('[header] Không có #nini_header'); return; }

    root.innerHTML = `
      <div class="nini-header-wrap">
        <div class="brand">
          <a class="logo" href="/#/home" title="NiNi — Funny"></a>
          <span class="slogan">chơi mê ly, bứt phá tư duy</span>
        </div>
        <nav class="nav">
          <a class="nav-link" href="/#/home">Trang chủ</a>
          <a class="nav-link" href="/#/rules">Luật chơi</a>
        </nav>
        <div class="userbox">
          <button id="btnAuthOpen" class="btn-auth guest-only" type="button">Đăng nhập / Đăng ký</button>
          <div class="user-info auth-only" id="userInfo">
            <button id="btnProfile" class="avatar" type="button" title="Hồ sơ"></button>
            <span class="nick" id="userNick"></span>
            <button id="btnLogout" class="btn-auth" type="button" data-auth="logout">Đăng xuất</button>
          </div>
        </div>
      </div>
    `;

    // cleanup auth controls cũ nằm ngoài header
    document.querySelectorAll('.btn-auth, .avatar, .user-info').forEach(el => {
      if (!el.closest('#nini_header')) el.remove();
    });

    // open auth modal
    $('#btnAuthOpen')?.addEventListener('click', () => {
      if (N.emit) N.emit('auth:open');
      const m = document.getElementById('authModal');
      if (m) {
        m.classList.remove('hidden');
        m.setAttribute('aria-hidden', 'false');
        document.body.classList.add('body-auth-open');
      }
    });

    // profile page
    $('#btnProfile')?.addEventListener('click', () => { location.href = '/profile.html'; });

    // logout: để auth-glue “bắt” bằng event delegation (cũng OK nếu gọi trực tiếp)
    $('#btnLogout')?.addEventListener('click', (e) => e.preventDefault());
  }

  function updateAuthUI(user) {
    const btnAuth = document.getElementById('btnAuthOpen');
    const boxUser = document.getElementById('userInfo');
    const nick = document.getElementById('userNick');
    const ava = document.getElementById('btnProfile');

    if (user) {
      document.body.setAttribute('data-auth', 'in');
      btnAuth && (btnAuth.style.display = 'none');
      boxUser && (boxUser.style.display = 'inline-flex');

      const display = user.displayName || (user.email ? user.email.split('@')[0] : '') || 'NiNi';
      nick && (nick.textContent = display);

      if (user.photoURL) {
        ava?.style.setProperty('background-image', `url("${user.photoURL}")`);
        ava?.style.setProperty('background-size', 'cover');
      } else {
        ava?.style.removeProperty('background-image');
      }
    } else {
      document.body.setAttribute('data-auth', 'out');
      boxUser && (boxUser.style.display = 'none');
      btnAuth && (btnAuth.style.display = 'inline-flex');
      ava?.style.removeProperty('background-image');
    }
  }

  ready(() => {
    render();

    // subscribe từ fb (auth-glue cũng subscribe, 2 nơi cùng set UI KHÔNG xung đột)
    const fb = N.fb || {};
    fb.onUserChanged && fb.onUserChanged(updateAuthUI);
    try { if (fb.currentUser) updateAuthUI(fb.currentUser()); } catch {}
  });
})();
