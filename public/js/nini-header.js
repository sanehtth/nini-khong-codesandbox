// NiNi - Header Auth/Brand UI (dùng chung cho mọi trang)
(function () {
  const ACTIVE_KEY = 'NINI_ACTIVE_USER_V3';
  const ACCS_KEY   = 'NINI_ACCOUNTS_V3';
  const LOGGED_KEY = 'NINI_AUTH_LOGGED_IN';
  const BRAND_KEY  = 'NINI_THEME_BRAND';
  const FALLBACK_AVATAR = '/public/assets/avatar/NV1.webp';

  function readActiveProfile() {
    try {
      const uid  = JSON.parse(localStorage.getItem(ACTIVE_KEY) || 'null');
      const accs = JSON.parse(localStorage.getItem(ACCS_KEY)   || '{}');
      return (uid && accs && accs[uid]) ? accs[uid] : null;
    } catch { return null; }
  }

  function applyAuthUI() {
    const logged = localStorage.getItem(LOGGED_KEY) === '1';

    document.querySelectorAll('[data-show="in"]')
      .forEach(el => el.style.display = logged ? '' : 'none');
    document.querySelectorAll('[data-show="out"]')
      .forEach(el => el.style.display = logged ? 'none' : '');

    // avatar ở header (id="avatarImg" hoặc class="avatar-img")
    const pf  = readActiveProfile();
    const url = (pf && pf.avatarUrl) ? pf.avatarUrl : FALLBACK_AVATAR;
    const abs = new URL(url, location.origin).href;
    document.querySelectorAll('#avatarImg,.avatar-img').forEach(img => {
      if (img && img.src !== abs) img.src = url;
    });

    // tên ngắn ở nút đăng xuất (span.who)
    const who = (pf && (pf.name || pf.displayName)) ? `(${pf.name || pf.displayName})` : '';
    document.querySelectorAll('.who').forEach(el => el.textContent = who);
  }

  function applyBrand() {
    try {
      const b = JSON.parse(localStorage.getItem(BRAND_KEY) || '{}');
      if (b.logoMain)  document.querySelectorAll('.brand__logo').forEach(i => i.src = b.logoMain);
      if (b.logoSmall) document.querySelectorAll('.brand__logo--small').forEach(i => i.src = b.logoSmall);
      if (b.slogan)    document.querySelectorAll('.brand__slogan').forEach(e => e.textContent = b.slogan);
    } catch {}
  }

  function init() {
    applyBrand();
    applyAuthUI();

    // Nghe các sự kiện chuẩn trong site
    window.addEventListener('nini:authchange',    applyAuthUI);
    window.addEventListener('nini:profilechange', applyAuthUI);

    // Sync khi tab khác thay đổi localStorage
    window.addEventListener('storage', (e) => {
      if ([ACCS_KEY, ACTIVE_KEY, LOGGED_KEY].includes(e.key)) applyAuthUI();
      if (e.key === BRAND_KEY) applyBrand();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
