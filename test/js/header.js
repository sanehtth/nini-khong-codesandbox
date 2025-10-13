/* =========================================================
 * header.js — Header dùng chung cho mọi trang
 * - Chỉ render 1 logo (logo_text.webp)
 * - Theo dõi trạng thái đăng nhập: set flag body[data-auth]
 * - Toggle nút guest/auth
 * - Click avatar -> profile.html
 * =======================================================*/
(function () {
  const N = (window.NINI = window.NINI || {});
  if (N._wiredHeader) return;
  N._wiredHeader = true;

  function mount(sel = '#nini_header') {
    const root = document.querySelector(sel) || (() => {
      const h = document.createElement('header'); h.id = 'nini_header';
      document.body.prepend(h); return h;
    })();

    // HTML: chỉ dùng logo_text.webp (logo-left). KHÔNG render icon nhỏ.
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

          <!-- guest -->
          <button id="btnAuthOpen" class="btn-auth guest-only" type="button">Đăng nhập / Đăng ký</button>
          <!-- authed -->
          <button id="btnLogout" class="btn-auth auth-only" type="button" data-auth="logout">Đăng xuất</button>
        </div>
      </div>
    `;

    // mở modal auth
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

    // avatar -> profile
    root.querySelector('#niniAvatar')?.addEventListener('click', (e) => {
      e.preventDefault();
      // chỉ đi khi đã đăng nhập
      const authed = document.body.dataset.auth === 'in';
      if (authed) location.href = '/profile.html';
    });

    function renderUser(u){
      const $email  = root.querySelector('#niniEmail');
      const $avatar = root.querySelector('#niniAvatar');

      if (u){
        document.body.dataset.auth = 'in';
        $email.textContent = u.displayName || u.email || '';
        $avatar.src = u.photoURL || ''; // rỗng -> dùng avatar default từ CSS
      } else {
        document.body.dataset.auth = 'out';
        $email.textContent = '';
        $avatar.src = '';              // rỗng -> avatar default
      }
    }

    try { N.fb?.onUserChanged && N.fb.onUserChanged(renderUser); } catch {}
    return root;
  }

  N.header = { mount };

  if (document.readyState !== 'loading') mount();
  else document.addEventListener('DOMContentLoaded', () => mount());
})();
