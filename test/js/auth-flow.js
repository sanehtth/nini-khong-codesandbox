<script>
// auth-flow.js — gắn listener 1 lần bằng event delegation + đồng bộ UI
(function () {
  const N = (window.NINI = window.NINI || {});

  // ====== Delegation: click trên document ======
  document.addEventListener('click', async (e) => {
    // mở modal đăng nhập/đăng ký
    const openBtn = e.target.closest('#btnAuthOpen, [data-auth="open"]');
    if (openBtn) {
      e.preventDefault();
      N.emit?.('auth:open');
      const m = document.getElementById('authModal');
      if (m) {
        m.classList.remove('hidden');
        m.setAttribute('aria-hidden', 'false');
        document.body.classList.add('body-auth-open');
      }
      return;
    }

    // avatar → profile (chỉ khi đã đăng nhập)
    const avaBtn = e.target.closest('#btnProfile, [data-auth="avatar"]');
    if (avaBtn) {
      e.preventDefault();
      if (document.body.dataset.auth === 'in') {
        location.href = '/profile.html';
      } else {
        N.emit?.('auth:open');
      }
      return;
    }

    // đăng xuất
    const outBtn = e.target.closest('#btnSignOut, [data-auth="logout"]');
    if (outBtn) {
      e.preventDefault();
      try {
        await NINI.fb?.signOut?.();     // gọi Firebase signOut
      } catch (err) {
        console.error('[auth] signOut error:', err);
      }
      return;
    }
  });

  // ====== Toggle UI theo trạng thái đăng nhập ======
  function updateAuthUI(user) {
    const btnAuth = document.getElementById('btnAuthOpen');
    const boxUser = document.getElementById('userInfo');
    const nick    = document.getElementById('userNick');
    const ava     = document.getElementById('btnProfile');

    if (user) {
      document.body.dataset.auth = 'in';
      if (btnAuth) btnAuth.style.display = 'none';
      if (boxUser) boxUser.style.display = 'inline-flex';

      const display = user.displayName || (user.email ? user.email.split('@')[0] : 'NiNi');
      if (nick) nick.textContent = display;

      const letter = (display || 'U').trim()[0].toUpperCase();
      if (ava) {
        if (user.photoURL) {
          ava.style.setProperty('--ava-bg', `url("${user.photoURL}")`);
        } else {
          ava.style.removeProperty('--ava-bg');
        }
        ava.setAttribute('data-letter', letter);
      }
    } else {
      document.body.dataset.auth = 'out';
      if (boxUser) boxUser.style.display = 'none';
      if (btnAuth) btnAuth.style.display = 'inline-flex';
      if (ava) {
        ava.style.removeProperty('--ava-bg');
        ava.setAttribute('data-letter', 'U');
      }
    }
  }

  // nhận sự kiện từ Firebase
  try {
    NINI.fb?.onUserChanged?.(updateAuthUI);
    // cập nhật ngay lúc khởi động
    const current = NINI.fb?.currentUser?.();
    if (current) updateAuthUI(current);
  } catch (e) {
    console.warn('[auth-flow] onUserChanged not ready yet');
  }
})();
</script>
