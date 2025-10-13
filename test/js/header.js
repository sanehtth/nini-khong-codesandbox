/* =========================================================
 * header.js — Header dùng chung cho mọi trang
 * - Không hardcode URL ảnh (logo/avatar lấy từ base.css)
 * - Render 1 lần vào #nini_header (auto-mount)
 * - Mở modal auth & xử lý logout
 * - Đồng bộ trạng thái người dùng (email/avatar) qua NINI.fb.onUserChanged
 * =======================================================*/
(function () {
  const N = (window.NINI = window.NINI || {});
  if (N._wiredHeader) return;             // tránh gắn 2 lần
  N._wiredHeader = true;

  // mount header vào #nini_header (hoặc tự tạo nếu thiếu)
  function mount(sel = '#nini_header') {
    const root = document.querySelector(sel) || (() => {
      const h = document.createElement('header'); h.id = 'nini_header';
      document.body.prepend(h); return h;
    })();

    // HTML header tối giản: brand + nav + user box
    root.innerHTML = `
      <div class="nini-header-wrap">
        <a href="/#/home" class="site-brand" data-auto-slogan aria-label="NiNi">
          <i class="title-logo"></i>
          <i class="logo-left"></i>
        </a>

        <nav class="nav">
          <a href="/#/home" class="nav-link">Trang chủ</a>
          <a href="/#/rules" class="nav-link">Luật chơi</a>
        </nav>

        <div class="userbox">
          <img class="avatar" id="niniAvatar" alt="avatar">
          <span id="niniEmail" class="email"></span>
          <button id="btnAuthOpen" class="btn-auth" type="button">Đăng nhập / Đăng ký</button>
          <button id="btnLogout" class="btn-auth" type="button" style="display:none" data-auth="logout">Đăng xuất</button>
        </div>
      </div>
    `;

    // mở modal auth (emit để auth-modal.js/onoff.js xử lý)
    root.querySelector('#btnAuthOpen')?.addEventListener('click', (e) => {
      e.preventDefault();
      if (N.emit) N.emit('auth:open');
      // fallback nếu không có event-bus: tự mở modal nếu #authModal tồn tại
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

    // render trạng thái user
    function renderUser(u){
      const $email  = root.querySelector('#niniEmail');
      const $avatar = root.querySelector('#niniAvatar');
      const $open   = root.querySelector('#btnAuthOpen');
      const $out    = root.querySelector('#btnLogout');

      if (u){
        $email.textContent = u.displayName || u.email || '';
        $avatar.src = u.photoURL || '';    // rỗng → CSS hiện avatar default
        $open.style.display = 'none';
        $out.style.display  = '';
      } else {
        $email.textContent = '';
        $avatar.src = '';                  // rỗng → CSS hiện avatar default
        $open.style.display = '';
        $out.style.display  = 'none';
      }
    }

    // lắng nghe thay đổi user (Firebase wrapper của bạn)
    try { N.fb?.onUserChanged && N.fb.onUserChanged(renderUser); } catch {}
    return root;
  }

  // expose
  N.header = { mount };

  // auto-mount khi DOM sẵn sàng
  if (document.readyState !== 'loading') mount();
  else document.addEventListener('DOMContentLoaded', () => mount());
})();
