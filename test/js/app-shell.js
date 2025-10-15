/* app-shell.js — Router + đồng bộ trạng thái đăng nhập (Firebase thật)
 * - KHÔNG dùng mock nữa.
 * - Trông đợi N.fb đã được gắn bởi /test/js/nini-fb.mjs (Firebase config + methods).
 * - Dùng event bus trong core.js: N.on / N.emit.
 */
(function () {
  const N = (window.NINI = window.NINI || {});
  if (N._wiredAppShell) return;
  N._wiredAppShell = true;

  // ---------- Helpers ----------
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  // Router state
  N.route = N.route || { current: 'home' };
  const PAGES = ['home','rules','forum','contact','storybook','video','game','shop','chat','notify','settings','profile'];

  function navigate(name) {
    if (!PAGES.includes(name)) name = 'home';
    N.route.current = name;
    // stage.js tạo DOM, ta chỉ ẩn/hiện theo id: #page-...
    PAGES.forEach(p => {
      const sec = document.getElementById(`page-${p}`);
      if (sec) sec.hidden = (p !== name);
    });
    const target = `#/${name}`;
    if (location.hash !== target) history.pushState({}, '', target);
  }

  window.addEventListener('popstate', () => {
    const name = (location.hash.replace('#/','') || 'home');
    navigate(name);
  });

  // ---------- Auth UI sync ----------
  // Các node trong header-tab.js
  function headerNodes() {
    const root = $('#nini_header') || document;
    return {
      loginBtn : root.querySelector('#btnSignIn'),
      logoutBtn: root.querySelector('#btnSignOut'),
      avatarBtn: root.querySelector('#btnProfile'),  // nút avatar (nếu có)
      nickSpan : root.querySelector('#userNick'),
      userInfo : root.querySelector('#userInfo')
    };
  }

  function applyUser(user) {
    const { loginBtn, logoutBtn, avatarBtn, nickSpan, userInfo } = headerNodes();
    const isIn = !!user;

    // Toggle
    if (loginBtn)  loginBtn.hidden  = isIn;
    if (logoutBtn) logoutBtn.hidden = !isIn;
    if (userInfo)  userInfo.style.display = isIn ? 'inline-flex' : 'none';

    // Thông tin hiển thị
    if (isIn) {
      const display = user.displayName || (user.email ? user.email.split('@')[0] : 'NiNi');
      if (nickSpan) nickSpan.textContent = display;
      if (avatarBtn) {
        // chữ cái nếu không có photoURL
        if (user.photoURL) {
          avatarBtn.style.setProperty('--ava-bg', `url("${user.photoURL}")`);
        } else {
          avatarBtn.style.removeProperty('--ava-bg');
        }
        const letter = (display.trim()[0] || 'U').toUpperCase();
        avatarBtn.setAttribute('data-letter', letter);
      }
    } else {
      if (nickSpan) nickSpan.textContent = '';
      if (avatarBtn) {
        avatarBtn.style.removeProperty('--ava-bg');
        avatarBtn.setAttribute('data-letter', 'U');
      }
    }
  }

  // ---------- Event delegation toàn trang ----------
  document.addEventListener('click', async (ev) => {
    const t = ev.target.closest('[data-nav],[data-item],[data-auth],[data-action],#btnSignIn,#btnSignOut,#btnProfile');
    if (!t) return;

    // Điều hướng (header tabs + rail)
    if (t.dataset.nav) {
      ev.preventDefault();
      navigate(t.dataset.nav);
      return;
    }

    // Chọn item ở cột trái (storybook/video/game/shop...) -> nạp chi tiết sang khung phải
    if (t.dataset.item) {
      ev.preventDefault();
      // stage.js đã render #detail-box trong page hiện tại
      const visiblePage = PAGES.map(p => document.getElementById(`page-${p}`)).find(el => el && !el.hidden);
      const box = visiblePage?.querySelector('#detail-box');
      if (box) {
        const title = (t.textContent || '').trim() || t.dataset.item;
        box.innerHTML = `
          <div class="glass p-4">
            <h3 style="margin-top:0">${title}</h3>
            <p>Chi tiết của <b>${t.dataset.item}</b> sẽ hiển thị ở đây.</p>
          </div>`;
      }
      return;
    }

    // Auth: mở/đóng modal
    if (t.id === 'btnSignIn' || t.dataset.auth === 'open') {
      ev.preventDefault();
      N.emit && N.emit('auth:open');
      return;
    }
    if (t.dataset.auth === 'close') {
      ev.preventDefault();
      N.emit && N.emit('auth:close');
      return;
    }

    // Avatar -> đi tới profile
    if (t.id === 'btnProfile') {
      ev.preventDefault();
      navigate('profile');
      return;
    }

    // Logout thật (Firebase)
    if (t.id === 'btnSignOut' || t.dataset.action === 'signout') {
      ev.preventDefault();
      try {
        await N.fb?.logout?.();
      } catch (e) {
        console.error('[logout]', e);
      }
      return;
    }
  });

  // ---------- Lắng nghe thay đổi user từ Firebase ----------
  try {
    if (N.fb?.onUserChanged) {
      N.fb.onUserChanged((u) => {
        applyUser(u);
        // Nếu cần bảo vệ route: ví dụ /profile chỉ cho user login
        if (!u && N.route.current === 'profile') navigate('home');
      });
    }
  } catch (e) {
    console.warn('[app-shell] onUserChanged not available yet');
  }

  // ---------- Khi modal auth submit xong / đóng -> sync header ----------
  N.on && N.on('auth:done',  (u) => applyUser(u));
  N.on && N.on('auth:close', () => {
    // Sau khi đóng modal, kiểm tra lại user hiện tại
    try {
      const u = N.fb?.currentUser?.();
      applyUser(u || null);
    } catch {}
  });

  // ---------- Khởi động ----------
  // Route theo hash hiện tại
  const initial = (location.hash.replace('#/','') || 'home');
  navigate(initial);

  // Nếu đã đăng nhập sẵn (Firebase giữ phiên), cập nhật ngay
  try {
    const u = N.fb?.currentUser?.();
    if (u) applyUser(u);
  } catch {}
})();
