// /public/js/nini-header.js
(() => {
  const KEY_SEASON = 'NINI_SEASON';
  const SEASONS = ['home', 'spring', 'summer', 'autumn', 'winter'];
  const LABELS = { home: 'Home', spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter' };

  function setSeasonClass(s) {
    const body = document.body;
    SEASONS.forEach(x => body.classList.remove(x));
    body.classList.add(s);
  }

  // ---- đọc mùa từ URL (hash) hoặc rớt về localStorage
  function seasonFromURL() {
    // #/spring | #/winter | #/home ...
    const h = (location.hash || '').toLowerCase();
    for (const s of SEASONS) if (h.includes(`/${s}`)) return s;
    return null;
  }

  function currentSeason() {
    return seasonFromURL() || localStorage.getItem(KEY_SEASON) || 'spring';
  }

  // ---- UI user (avatar / login)
  function userHTML(u) {
    if (!u) {
      return `
        <button class="btn-login" id="niniLoginBtn">Đăng nhập / Đăng ký</button>
      `;
    }
    const avatar = u.photoURL || '/public/assets/avatar/NiNi.webp';
    return `
      <img class="avatar" src="${avatar}" alt="" />
      <span class="email">${u.email || ''}</span>
      <button class="btn-logout" id="niniLogoutBtn">Đăng xuất</button>
    `;
  }

  // ---- gắn events cho user slot theo trạng thái đăng nhập
  function wireUserSlot(root, user) {
    const loginBtn = root.querySelector('#niniLoginBtn');
    if (loginBtn) {
      loginBtn.addEventListener('click', () => {
        // mở modal đăng nhập của bạn
        if (globalThis.NINI?.fb?.loginModal) globalThis.NINI.fb.loginModal();
      });
    }
    const logoutBtn = root.querySelector('#niniLogoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        if (globalThis.NINI?.fb?.logout) await globalThis.NINI.fb.logout();
      });
    }
  }

  // ---- dựng HTML cho header
  function renderHeaderHTML(brand) {
    const brandHTML = `
      <div class="brand">
        <a class="logo" href="#/home" aria-label="NiNi home">
          <img class="logo-main" src="${brand.logo}" alt="" />
        </a>
        <a class="logo-small" href="#/home" aria-label="NiNi">
          <img class="logo-small-img" src="${brand.logoSmall}" alt="" />
        </a>
        <span class="slogan">${brand.sloganText || ''}</span>
      </div>
    `;

    const tabsHTML = `
      <nav class="tabs">
        ${SEASONS.map(s => `
          <a class="chip" data-s="${s}" href="#/${s}">${LABELS[s]}</a>
        `).join('')}
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

    // brand config (đã dùng đường dẫn bạn cung cấp)
    const brand = Object.assign({
      logo: '/public/assets/icons/logonini.webp',
      logoSmall: '/public/assets/icons/logo_text.webp',
      sloganText: 'Chơi mê ly, bứt phá tư duy'
    }, (opts.brand || {}));

    // render lần đầu
    root.innerHTML = renderHeaderHTML(brand);

    // set mùa hiện tại
    const s0 = currentSeason();
    setSeasonClass(s0);
    localStorage.setItem(KEY_SEASON, s0);

    // click tab: chỉ cần để <a href="#/xxx"> — không chặn, hashchange sẽ xử lý
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
    }
    window.addEventListener('hashchange', syncFromHash);

    // cập nhật user slot
    async function applyUser() {
      let u = null;
      try {
        if (globalThis.NINI?.fb?.getCurrentUser) {
          u = await globalThis.NINI.fb.getCurrentUser();
        }
      } catch (e) {}
      const slot = root.querySelector('#niniUserSlot');
      if (slot) {
        slot.innerHTML = userHTML(u);
        wireUserSlot(root, u);
      }
    }
    applyUser();

    // nếu sdk có notify auth-change
    if (globalThis.NINI?.fb?.onAuthChange) {
      globalThis.NINI.fb.onAuthChange(applyUser);
    }
  }

  // expose
  globalThis.NINI = globalThis.NINI || {};
  globalThis.NINI.header = { mount };

  // ---- styles nhỏ cho header
  const css = `
  .nini-header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 14px;border-radius:16px;margin:8px;}
  .nini-header .brand{display:flex;align-items:center;gap:12px}
  .nini-header .logo-main{height:28px}
  .nini-header .logo-small-img{height:26px}
  .nini-header .slogan{font-weight:600;opacity:.9}
  .nini-header .tabs{display:flex;gap:8px}
  .nini-header .chip{display:inline-block;padding:6px 12px;border-radius:999px;cursor:pointer;
     border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.06);text-decoration:none;color:inherit}
  .nini-header .chip:hover{filter:brightness(1.06)}
  .nini-header .user-slot{display:flex;align-items:center;gap:8px}
  .nini-header .user-slot .avatar{height:28px;width:28px;border-radius:50%}
  .glass{backdrop-filter:blur(6px);background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18)}
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
})();
