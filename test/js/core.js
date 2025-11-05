// /test/js/core.js
;(() => {
  window.NINI = window.NINI || {};
  const NINI = window.NINI;

  // dom helpers
  NINI.$  = (sel, root=document) => root.querySelector(sel);
  NINI.$$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  // pubsub helpers
  NINI.emit = (name, detail) => document.dispatchEvent(new CustomEvent(name, { detail }));
  NINI.on   = (name, fn) => document.addEventListener(name, fn);

  // theme helper (giữ lại)
  NINI.setSeason = (s) => {
    document.body.classList.remove('spring','summer','autumn','winter');
    document.body.classList.add(s);
  };

  // mountOnce
  NINI.mountOnce = (selector, render) => {
    const el = NINI.$(selector);
    if (!el || el.__mounted) return;
    el.__mounted = true;
    render(el);
  };

  // ---- AUTH BRIDGE ----
  function updateBody(user){
    document.body.classList.toggle('nini-logged-in', !!user);
  }

  function hookFirebase(){
    const fb = window.N?.fb;
    if (!fb) return false;
    const on = fb.onAuthChanged || fb.onUserChanged; // chấp cả 2 tên
    if (typeof on === "function"){
      on(user => {
        // phát kênh thống nhất + set body state
        document.dispatchEvent(new CustomEvent("NiNi:user-changed", { detail: user || null }));
        updateBody(user);
      });
      // set lúc đầu
      updateBody(fb.currentUser && (typeof fb.currentUser === "function" ? fb.currentUser() : fb.currentUser));
      return true;
    }
    return false;
  }

  // thử hook ngay; nếu fb chưa sẵn sàng thì chờ fb-ready
  if (!hookFirebase()){
    document.addEventListener("NiNi:fb-ready", hookFirebase, { once:true });
  }

  // mở modal auth tiện dụng
  NINI.openAuth = (tab="login") => window.NiNiAuth?.open?.(tab);
})();
