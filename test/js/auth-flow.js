/* auth-flow.js
 * Quản lý 1 cờ đăng nhập duy nhất + 3 hàm: loginUI, logoutUI, checkAuthState
 * Nút Đóng modal: chạy checkAuthState() trước, rồi mới đóng modal.
 */
(function () {
  const N = (window.NINI = window.NINI || {});
  if (N._wiredAuthFlow) return; N._wiredAuthFlow = true;

  // ===== Helpers =====
  const $ = (s, r = document) => r.querySelector(s);
  const KEY = 'nini.auth';                 // cache flag "1"/"0"
  let flag = false;                        // flag mặc định

  function setFlag(v) {
    flag = !!v;
    try { localStorage.setItem(KEY, flag ? '1' : '0'); } catch (_) {}
    document.body.dataset.auth = flag ? 'in' : 'out';
  }
  function getFlag() {
    try {
      const u = N.fb?.currentUser?.();
      if (u) return true;
    } catch (_) {}
    return (localStorage.getItem(KEY) === '1');
  }

  // Modal utils
  function openModal() {
    const m = $('#authModal');
    if (!m) return;
    m.classList.remove('hidden');
    m.setAttribute('aria-hidden', 'false');
    document.body.classList.add('body-auth-open');
  }
  function closeModal() {
    const m = $('#authModal');
    if (!m) return;
    m.classList.add('hidden');
    m.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('body-auth-open');
  }

  // ===== Lấy control từ header =====
  function pickControls() {
    const root = $('#nini_header') || document;
    return {
      btnLogin : root.querySelector('#btnAuthOpen, [data-auth="open"]'),
      btnLogout: root.querySelector('#btnSignOut,  [data-auth="logout"]'),
      boxUser  : root.querySelector('#userInfo,    .user-info'),
      avaBtn   : root.querySelector('#btnProfile,  .avatar'),
      nickSpan : root.querySelector('#userNick,    .nick')
    };
  }

  // ===== 1) Hàm đăng nhập (UI) =====
  function loginUI(user) {
    const { btnLogin, btnLogout, boxUser, avaBtn, nickSpan } = pickControls();
    setFlag(true);

    if (btnLogin)  btnLogin.style.display  = 'none';
    if (btnLogout) btnLogout.style.display = 'inline-flex';
    if (boxUser)   boxUser.style.display   = 'inline-flex';

    const display = (user && (user.displayName || (user.email ? user.email.split('@')[0] : ''))) || 'NiNi';
    if (nickSpan) nickSpan.textContent = display;

    const letter = (display || 'U').trim().charAt(0).toUpperCase();
    if (avaBtn) {
      if (user && user.photoURL) {
        avaBtn.style.background = `url('${user.photoURL}') center/cover no-repeat`;
        avaBtn.textContent = '';
      } else {
        avaBtn.style.background = '#2e7d32';
        avaBtn.textContent = letter;
      }
    }
  }

  // ===== 2) Hàm đăng xuất (UI) =====
  function logoutUI() {
    const { btnLogin, btnLogout, boxUser, avaBtn, nickSpan } = pickControls();
    setFlag(false);

    if (btnLogin)  btnLogin.style.display  = 'inline-flex';
    if (btnLogout) btnLogout.style.display = 'none';
    if (boxUser)   boxUser.style.display   = 'none';

    if (avaBtn) {
      avaBtn.style.background = '#2e7d32';
      avaBtn.textContent = 'U';
    }
    if (nickSpan) nickSpan.textContent = '';
  }

  // ===== 3) Hàm kiểm tra trạng thái thực tế để áp UI =====
  function checkAuthState() {
    let user = null;
    try { user = N.fb?.currentUser?.() || null; } catch (_) {}
    if (user) loginUI(user); else logoutUI();
  }

  // ===== Wire nút và sự kiện =====
  function wireOnce() {
    const { btnLogin, btnLogout, avaBtn } = pickControls();

    // Avatar -> profile
    if (avaBtn && !avaBtn._wired) {
      avaBtn._wired = true;
      avaBtn.addEventListener('click', () => location.href = '/profile.html');
    }

    // Nút Đăng nhập -> mở modal
    if (btnLogin && !btnLogin._wired) {
      btnLogin._wired = true;
      btnLogin.addEventListener('click', openModal);
    }

    // Nút Đăng xuất
    if (btnLogout && !btnLogout._wired) {
      btnLogout._wired = true;
      btnLogout.addEventListener('click', async () => {
        try { await N.fb?.signOut?.(); } catch (_) {}
        checkAuthState();
      });
    }

    // Nút đóng modal: KIỂM TRA TRƯỚC, rồi MỚI ĐÓNG
    document.addEventListener('click', (e) => {
      const close = e.target.closest('[data-auth-close], #authClose, .auth-close');
      if (!close) return;
      // 1) Kiểm tra trạng thái & áp UI
      checkAuthState();
      // 2) Sau đó mới đóng modal
      closeModal();
    }, { capture: true });

    // Đồng bộ khi backend đổi trạng thái (Firebase)
    try {
      N.fb?.onUserChanged?.((u) => {
        if (u) loginUI(u); else logoutUI();
      });
    } catch (_) {}
  }

  // ===== Khởi tạo =====
  document.addEventListener('DOMContentLoaded', () => {
    wireOnce();
    if (getFlag()) loginUI(N.fb?.currentUser?.() || null);
    else logoutUI();
    setTimeout(checkAuthState, 0);
  }, { once: true });

  // Expose nếu cần gọi tay
  N.authUI = { loginUI, logoutUI, checkAuthState, openModal, closeModal };
})();
