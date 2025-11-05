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

// ==== NiNi auth bridge (cuối core.js) ====
(() => {
  const $ = (s, r = document) => r.querySelector(s);

  // Thống nhất 2 biến global
  window.NiNi = window.NiNi || window.NINI || {};
  window.NINI  = window.NiNi;

  function emitUser(u) {
    const user = u || null;
    window.NiNi.user = user;
    const evt = new CustomEvent('NiNi:user-changed', { detail: user });
    document.dispatchEvent(evt);
    window.dispatchEvent(new CustomEvent('NiNi:user-changed', { detail: user }));
    document.body.classList.toggle('nini-logged-in', !!user);
  }

  function tryHookFirebase() {
    const fb =
      (window.NiNi && window.NiNi.fb) ||
      (window.N && window.N.fb) || null;
    if (!fb) return false;

    // currentUser có thể là property HOẶC function
    const getCurrentUser = () =>
      typeof fb.currentUser === 'function' ? fb.currentUser() : fb.currentUser || null;

    if (typeof fb.onAuthStateChanged === 'function') {
      fb.onAuthStateChanged(u => emitUser(u));
      emitUser(getCurrentUser());   // bắn trạng thái hiện tại ngay
      return true;
    }
    if (typeof fb.onUserChanged === 'function') {
      fb.onUserChanged(u => emitUser(u));
      emitUser(getCurrentUser());
      return true;
    }
    return false;
  }

  if (!tryHookFirebase()) {
    document.addEventListener('NiNi:fb-ready', tryHookFirebase, { once: true });
  }

  window.NiNi.updateAuthUI = function () {
    const fab = document.querySelector('#authFab');
    if (fab) fab.style.display = window.NiNi.user ? 'none' : 'inline-flex';
  };

  window.addEventListener('NiNi:user-changed', window.NiNi.updateAuthUI);
})();


  window.addEventListener('NiNi:user-changed', window.NiNi.updateAuthUI);
})();

