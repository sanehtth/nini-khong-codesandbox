// nini-header.js
(() => {
  const $  = NINI.$;
  const $$ = NINI.$$;

  /* 1) Nạp CSS theme do bạn chỉnh trong Admin (nếu có) */
  (function loadTheme(){
    const ENDPOINT='/.netlify/functions/theme';
    const KEY='NINI_THEME_CACHE_V1';
    const MAX=3600; // 1h
    function inject(css){
      let s = document.getElementById('themeOverride');
      if(!s){ s=document.createElement('style'); s.id='themeOverride'; document.head.appendChild(s); }
      s.textContent = css;
    }
    try{
      const c = NINI.store.get(KEY);
      const now = (Date.now()/1000)|0;
      if (c && (now-(c.ts|0)) < MAX) inject(c.css);
      fetch(ENDPOINT,{cache:'no-store'})
        .then(r=>r.text()).then(css=>{ if(css){ inject(css); NINI.store.set(KEY,{ts:now, css}); } })
        .catch(()=>{});
    }catch{}
  })();

  /* 2) Áp dụng brand (logo/slogan) đã lưu */
  (function applyBrand(){
    try{
      const b = NINI.store.get('NINI_THEME_BRAND', {});
      if (b.logoMain)  $$('.brand__logo').forEach(i=> i.src = b.logoMain);
      if (b.slogan)    $$('.brand__slogan').forEach(e=> e.textContent = b.slogan);
    }catch{}
  })();

  /* 3) Toggle UI theo trạng thái đăng nhập (flag trong LS) */
  function applyAuthUI(){
    const logged = localStorage.getItem('NINI_AUTH_LOGGED_IN') === '1';
    $$('[data-show="in"]').forEach(el => el.style.display  = logged ? '' : 'none');
    $$('[data-show="out"]').forEach(el => el.style.display = logged ? 'none' : '');
  }
  applyAuthUI();
  document.addEventListener('nini:authchange', applyAuthUI);
  window.addEventListener('storage', e=>{
    if (e.key === 'NINI_AUTH_LOGGED_IN') applyAuthUI();
  });

  /* 4) Ảnh avatar trên header (đọc từ hồ sơ local) */
  function readActiveProfile(){
    const uid  = NINI.store.get('NINI_ACTIVE_USER_V3', null);
    const accs = NINI.store.get('NINI_ACCOUNTS_V3', {});
    return (uid && accs[uid]) ? accs[uid] : null;
  }
  function applyAvatar(){
    const img = $('#avatarImg'); if (!img) return;
    const FALLBACK = '/public/assets/avatar/NV1.webp';
    const pf = readActiveProfile();
    const url = (pf && pf.avatarUrl) ? pf.avatarUrl : FALLBACK;
    const abs = new URL(url, location.origin).href;
    if (img.src !== abs) img.src = url;
  }
  applyAvatar();
  document.addEventListener('nini:profilechange', applyAvatar);
  window.addEventListener('storage', e=>{
    if (e.key === 'NINI_ACCOUNTS_V3' || e.key === 'NINI_ACTIVE_USER_V3') applyAvatar();
  });

  /* 5) Alt+A: ẩn/hiện nút Admin nếu bạn muốn */
  (function adminHotkey(){
    const btn = document.getElementById('adminBtn');
    if (!btn) return;
    document.addEventListener('keydown', (e)=>{
      if (e.altKey && (e.key==='a' || e.key==='A')) btn.classList.toggle('is-hidden');
    });
  })();
})();
