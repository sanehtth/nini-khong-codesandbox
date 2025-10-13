(function () {
  const N = (window.NINI = window.NINI || {});
  if (N._wiredHeader) return;
  N._wiredHeader = true;

  function mount(sel = '#nini_header') {
    const root = document.querySelector(sel) || (() => {
      const h = document.createElement('header'); h.id = 'nini_header';
      document.body.prepend(h); return h;
    })();

    root.innerHTML = `
      <div class="nini-header-wrap">
        <a href="/#/home" class="site-brand" data-auto-slogan aria-label="NiNi">
          <i class="logo-left"></i>
        </a>

        <nav class="nav">
          <a href="/#/home" class="nav-link">Trang chủ</a>
          <a href="/#/rules" class="nav-link">Luật chơi</a>
        </nav>

        <div class="userbox">
          <img class="avatar" id="niniAvatar" alt="avatar">
          <span id="niniEmail" class="email"></span>
          <button id="btnAuthOpen" class="btn-auth guest-only" type="button">Đăng nhập / Đăng ký</button>
          <button id="btnLogout" class="btn-auth auth-only" type="button" data-auth="logout">Đăng xuất</button>
        </div>
      </div>
    `;

    // dọn sạch logo/badge legacy nếu còn trong DOM
    const kill = (s) => document.querySelectorAll(s).forEach(n => n.remove());
    kill('.nini-badge, .left-logo, .site-logo, .top-left-logo, .header-logo, .header__logo');

    // mở modal
    root.querySelector('#btnAuthOpen')?.addEventListener('click', (e) => {
      e.preventDefault();
      if (N.emit) N.emit('auth:open');
      const m = document.getElementById('authModal');
      if (m) {
        m.classList.remove('hidden');
        m.setAttribute('aria-hidden', 'false');
        document.body.classList.add('body-auth-open');
      }
    });

    // logout
    root.querySelector('#btnLogout')?.addEventListener('click', async (e) => {
      e.preventDefault();
      try { await N.fb?.logout?.(); } catch {}
    });

    // avatar & email -> profile
    const goProfile = (e) => {
      e.preventDefault();
      if (document.body.dataset.auth === 'in') location.href = '/profile.html';
    };
    root.querySelector('#niniAvatar')?.addEventListener('click', goProfile);
    root.querySelector('#niniEmail') ?.addEventListener('click', goProfile);

    function renderUser(u){
      const $email  = root.querySelector('#niniEmail');
      const $avatar = root.querySelector('#niniAvatar');

      if (u){
        document.body.dataset.auth = 'in';
        const nick = (u.displayName && u.displayName.trim()) || (u.email ? u.email.split('@')[0] : '');
        $email.textContent = nick;            // ✅ nickname thay vì email
        $avatar.src = u.photoURL || '';       // rỗng -> dùng avatar default từ CSS
        $email.style.cursor = 'pointer';
      } else {
        document.body.dataset.auth = 'out';
        $email.textContent = '';
        $avatar.src = '';
        $email.style.cursor = 'default';
      }
    }

    try { N.fb?.onUserChanged && N.fb.onUserChanged(renderUser); } catch {}
    return root;
  }

  N.header = { mount };
  if (document.readyState !== 'loading') mount();
  else document.addEventListener('DOMContentLoaded', () => mount());
})();
