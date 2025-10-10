<!-- /public/js/nini-header.js -->
<script>
(() => {
  const KEY_SEASON = 'NINI_SEASON';
  const SEASONS = ['home', 'spring', 'summer', 'autumn', 'winter'];
  const LABELS = { home: 'Home', spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter' };

  // ---- helpers
  function setSeasonClass(s) {
    const body = document.body;
    SEASONS.forEach(x => body.classList.remove(x));
    body.classList.add(s);
  }
  function seasonFromURL() {
    const h = (location.hash || '').toLowerCase();          // #/spring ...
    for (const s of SEASONS) if (h.includes(`/${s}`)) return s;
    return null;
  }
  function currentSeason() {
    return seasonFromURL() || localStorage.getItem(KEY_SEASON) || 'spring';
  }
  function setFavicon(href) {
    if (!href) return;
    let link = document.querySelector('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = href;
  }

  // ---- user slot
  function userHTML(u) {
    if (!u) return `<button class="btn-login" id="niniLoginBtn">Đăng nhập / Đăng ký</button>`;
    const avatar = u.photoURL || '/public/assets/avatar/NiNi.webp';
    const email  = u.email || '';
    return `
      <img class="avatar" src="${avatar}" alt="" />
      <span class="email">${email}</span>
      <button class="btn-logout" id="niniLogoutBtn">Đăng xuất</button>
    `;
  }
  function wireUserSlot(root, user) {
    const loginBtn = root.querySelector('#niniLoginBtn');
    if (loginBtn) loginBtn.addEventListener('click', () => {
      if (globalThis.NINI?.fb?.loginModal) globalThis.NINI.fb.loginModal();
    });
    const logoutBtn = root.querySelector('#niniLogoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', async () => {
      if (globalThis.NINI?.fb?.logout) await globalThis.NINI.fb.logout();
    });
  }

  // ---- header HTML
  function renderHeaderHTML(brand) {
    const brandHTML = `
      <div class="brand">
        <a class="logo" href="#/home" aria-label="NiNi Home">
          <img class="logo-main" src="${brand.logo}" alt="" />
        </a>
        <span class="slogan">${brand.sloganText || ''}</span>
      </div>
    `;
    const tabsHTML = `
      <nav class="tabs" aria-label="Seasons">
        ${SEASONS.map(s => `<a class="chip" data-s="${s}" href="#/${s}">${LABELS[s]}</a>`).join('')}
      </nav>
    `;
    return `
      <div class="nini-header glass">
        ${brandHTML}
        ${tabsHTML}
        <div class="user-slot" id="niniUserSlot"></div>
      </div>
    `;
  }

  // ---- mount
  function mount(selector, opts = {}) {
    const root = document.querySelector(selector);
    if (!root) return;

    // cấu hình nhận từ ngoài
    const brand = Object.assign({
      logo: '/public/assets/icons/logo_text.webp',
      sloganText: 'Chơi mê ly, bứt phá tư duy',
      favicon: '/public/assets/icons/logonini.svg'          // có thể bỏ nếu không dùng
    }, (opts.brand || {}));

    // favicon (tuỳ chọn)
    setFavicon(brand.favicon);

    // render
    root.innerHTML = renderHeaderHTML(brand);

    // trạng thái mùa ban đầu
    const s0 = currentSeason();
    localStorage.setItem(KEY_SEASON, s0);
    setSeasonClass(s0);
    highlightActive(root, s0);

    // click tab — chỉ lưu lại state, điều hướng dùng href="#/xxx"
    root.querySelectorAll('.tabs .chip').forEach(a => {
      a.addEventListener('click', () => {
        const s = a.dataset.s || 'spring';
        localStorage.setItem(KEY_SEASON, s);
      });
    });

    // đồng bộ khi hash thay đổi
    function syncFromHash() {
      const s = currentSeason();
      localStorage.setItem(KEY_SEASON, s);
      setSeasonClass(s);
      highlightActive(root, s);
    }
    window.addEventListener('hashchange', syncFromHash);

    // fill user slot
    async function applyUser() {
      let u = null;
      try {
        if (globalThis.NINI?.fb?.getCurrentUser) {
          u = await globalThis.NINI.fb.getCurrentUser();
        }
      } catch {}
      const slot = root.querySelector('#niniUserSlot');
      if (slot) {
        slot.innerHTML = userHTML(u);
        wireUserSlot(root, u);
      }
    }
    applyUser();

    // nghe sự kiện auth-change nếu SDK có
    if (globalThis.NINI?.fb?.onAuthChange) {
      globalThis.NINI.fb.onAuthChange(applyUser);
    }
  }

  function highlightActive(root, season) {
    root.querySelectorAll('.tabs .chip').forEach(a => {
      const is = a.dataset.s === season;
      a.classList.toggle('active', is);
      a.setAttribute('aria-current', is ? 'page' : 'false');
    });
  }

  // expose
  globalThis.NINI = globalThis.NINI || {};
  globalThis.NINI.header = { mount };

  // ---- styles nhỏ
  const css = `
  .nini-header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 14px;border-radius:16px;margin:8px auto;max-width:min(1200px, 94vw)}
  .nini-header .brand{display:flex;align-items:center;gap:12px}
  .nini-header .logo-main{height:28px}
  .nini-header .slogan{font-weight:600;opacity:.9}
  .nini-header .tabs{display:flex;gap:8px}
  .nini-header .chip{display:inline-block;padding:6px 12px;border-radius:999px;cursor:pointer;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.06);text-decoration:none;color:inherit}
  .nini-header .chip:hover{filter:brightness(1.06)}
  .nini-header .chip.active{border-color:rgba(255,255,255,.22);background:rgba(255,255,255,.14)}
  .nini-header .user-slot{display:flex;align-items:center;gap:8px}
  .nini-header .user-slot .avatar{height:28px;width:28px;border-radius:50%}
  .nini-header .btn-login,.nini-header .btn-logout{padding:6px 12px;border-radius:999px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.06);cursor:pointer}
  .glass{backdrop-filter:blur(6px);background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18)}
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
})();
</script>
