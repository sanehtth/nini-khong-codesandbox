/* header.js — safe render + cleanup legacy + auth toggle
 * NOTE:
 * - Render đúng một header vào #nini_header
 * - Cleanup: xóa control auth cũ nằm ngoài #nini_header (ngăn trùng U/N & 2 nút Đăng xuất)
 * - Toggle theo user: có user -> hiện avatar+nick+Đăng xuất; không user -> hiện Đăng nhập/Đăng ký
 */
(function () {
  const N = (window.NINI = window.NINI || {});
  if (N._wiredHeader) return;           // NOTE: chặn render 2 lần
  N._wiredHeader = true;

  const $ = (s, r = document) => r.querySelector(s);

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  function render() {
    const root = document.getElementById('nini_header');
    if (!root) {
      console.warn('[header] Không tìm thấy #nini_header');
      return;
    }

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

        <div class="userbox" id="userbox">
          <!-- trạng thái khi CHƯA đăng nhập -->
          <button id="btnAuthOpen" class="btn-auth" type="button">Đăng nhập / Đăng ký</button>

          <!-- trạng thái khi ĐÃ đăng nhập -->
          <div id="userInfo" class="user-info" style="display:none">
            <button id="btnProfile" class="avatar" type="button" title="Hồ sơ"></button>
            <span class="nick" id="userNick"></span>
            <button id="btnSignOut" class="btn-auth" type="button">Đăng xuất</button>
          </div>
        </div>
      </div>
    `;
  
   /* === CLEANUP LEGACY (mở rộng selector) ===
 * Gỡ mọi control auth/ user cũ KHÔNG nằm trong #nini_header
 */
document.querySelectorAll([
  // cái mới
  '.btn-auth', '.avatar', '.user-info',
  // cái cũ có thể còn
  '.btn-login', '.btn-logout', '#btnLogout', '.logout', '.login',
  '.user', '.userbox', '.user-menu', '.auth-controls', '.auth-box'
].join(',')).forEach(el => {
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

    // go profile
    $('#btnProfile')?.addEventListener('click', () => {
      location.href = '/profile.html';
    });

    // sign out
    $('#btnSignOut')?.addEventListener('click', async () => {
      try {
        await N.fb?.signOut?.();
      } catch (e) {
        console.error(e);
      }
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

      const display = user.displayName || (user.email ? user.email.split('@')[0] : '') || 'NiNi';
      if (nick) nick.textContent = display;

      const letter = display.trim()[0]?.toUpperCase?.() || 'U';
      if (ava) {
        // nếu có photoURL thì dùng, không có thì hiển thị chữ cái
        if (user.photoURL) {
          ava.style.setProperty('--ava-bg', `url("${user.photoURL}")`);
        } else {
          ava.style.removeProperty('--ava-bg');
        }
        ava.setAttribute('data-letter', letter);
      }
    } else {
      boxUser && (boxUser.style.display = 'none');
      btnAuth && (btnAuth.style.display = 'inline-flex');
      if (ava) {
        ava.style.removeProperty('--ava-bg');
        ava.setAttribute('data-letter', 'U');
      }
    }
  }

  // wire
  ready(() => {
    render();

    // subscribe user change -> toggle nút
    if (N.fb?.onUserChanged) N.fb.onUserChanged(updateAuthUI);

    // cập nhật ngay nếu đã đăng nhập sẵn
    if (N.fb?.currentUser) {
      try { updateAuthUI(N.fb.currentUser()); } catch (e) {}
    }
  });
})();

