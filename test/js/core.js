;(() => {
  window.NINI = window.NINI || {};
  const ev = (name, detail) => document.dispatchEvent(new CustomEvent(name, { detail }));

  // helpers DOM
  NINI.$ = (sel, root=document) => root.querySelector(sel);
  NINI.$$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  // simple pubsub
  NINI.on = (name, fn) => document.addEventListener(name, fn);
  NINI.emit = ev;

  // theme switch (spring/summer/autumn/winter)
  NINI.setSeason = (s) => {
    document.body.classList.remove('spring','summer','autumn','winter');
    document.body.classList.add(s);
  };

  // mount guard
  NINI.mountOnce = (selector, render) => {
    const el = NINI.$(selector);
    if (!el || el.__mounted) return;
    el.__mounted = true;
    render(el);
  };
})();

/* ===== NiNi auth bridge — dán ở CUỐI core.js ===== */
(() => {
  const $ = (s, r = document) => r.querySelector(s);

  // Thống nhất 2 biến global (lỡ nơi khác dùng NINI hoặc NiNi)
  window.NiNi = window.NiNi || window.NINI || {};
  window.NINI = window.NiNi;

  // Giữ user hiện tại + phát sự kiện cho UI
  function emitUser(u) {
    const user = u || null;
    window.NiNi.user = user;
    // phát cho cả document & window để code nào cũng nghe được
    const evt = new CustomEvent('NiNi:user-changed', { detail: user });
    document.dispatchEvent(evt);
    window.dispatchEvent(new CustomEvent('NiNi:user-changed', { detail: user }));
    document.body.classList.toggle('nini-logged-in', !!user);
  }

  // Thử gắn listener vào Firebase wrapper
  function tryHookFirebase() {
    const fb = window.NiNi && window.NiNi.fb;
    if (!fb) return false;

    // Trường hợp bạn có wrapper onAuthStateChanged
    if (typeof fb.onAuthStateChanged === 'function') {
      fb.onAuthStateChanged((u) => emitUser(u));
      emitUser(fb.currentUser || null);
      return true;
    }
    // Hoặc bạn đã tự làm onUserChanged
    if (typeof fb.onUserChanged === 'function') {
      fb.onUserChanged((u) => emitUser(u));
      emitUser(fb.currentUser || null);
      return true;
    }
    return false;
  }

  // Thử hook ngay; nếu fb chưa sẵn sàng thì đợi sự kiện báo "fb ready"
  if (!tryHookFirebase()) {
    document.addEventListener('NiNi:fb-ready', tryHookFirebase, { once: true });
  }

  // Tiện ích nhỏ để cập nhật UI login/logout nếu cần gọi thủ công
  window.NiNi.updateAuthUI = function () {
    const fab = $('#authFab');
    if (fab) fab.style.display = window.NiNi.user ? 'none' : 'inline-flex';
  };

  window.addEventListener('NiNi:user-changed', window.NiNi.updateAuthUI);
})();
