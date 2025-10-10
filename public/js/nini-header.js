// /public/js/nini-header.js
// Non-module. Yêu cầu window.NINI.fb (do nini-fb.mjs gắn sẵn).
(function () {
  const NS = (window.NINI ||= {});
  const H = NS.header ||= {};

  // helper set body class theo hash (#/home|spring|...)
  function applySeasonFromHash() {
    const map = { home:"home", spring:"spring", summer:"summer", autumn:"autumn", winter:"winter" };
    const seg = (location.hash.replace(/^#\/?/,'') || 'spring').toLowerCase();
    const cl = map[seg] || 'spring';
    document.body.classList.remove('home','spring','summer','autumn','winter');
    document.body.classList.add(cl);
  }
  window.addEventListener('hashchange', applySeasonFromHash);

  function html(opts) {
    const brandLogo = (opts.brand && opts.brand.logo) || "/public/assets/icons/logo_text.webp";
    const slogan    = (opts.brand && opts.brand.sloganText) || "Chơi mê ly, bứt phá tư duy";
    return `
      <div class="nini-header glass">
        <div class="brand">
          <a class="logo" href="/"><img src="${brandLogo}" alt="NiNi" style="height:22px;vertical-align:middle"/></a>
          <span class="slogan">${slogan}</span>
        </div>
        <nav class="tabs">
          <button data-s="home">Home</button>
          <button data-s="spring">Spring</button>
          <button data-s="summer">Summer</button>
          <button data-s="autumn">Autumn</button>
          <button data-s="winter">Winter</button>
        </nav>
        <div class="user-slot" id="niniUserSlot"></div>
      </div>
    `;
  }

  function bindInteractions(root, opts) {
    // chuyển mùa
    root.querySelectorAll('.tabs [data-s]').forEach(btn => {
      btn.addEventListener('click', () => {
        const s = btn.dataset.s;
        location.hash = `#/${s}`;
        applySeasonFromHash();
      });
    });

    // user slot
    const slot = root.querySelector('#niniUserSlot');

    async function renderUser(u) {
      if (!slot) return;
      if (u) {
        slot.innerHTML = `
          <img src="${u.photoURL || '/public/assets/avatar/NV1.webp'}" style="width:28px;height:28px;border-radius:999px;vertical-align:middle;margin-right:8px">
          <span style="opacity:.9;margin-right:8px">${u.email || ''}</span>
          <button class="chip" id="btnLogout">Đăng xuất</button>
        `;
        slot.querySelector('#btnLogout').onclick = () => NINI.fb.logout();
      } else {
        slot.innerHTML = `<button class="chip" id="btnLogin">Đăng nhập / Đăng ký</button>`;
        slot.querySelector('#btnLogin').onclick = () => NINI.fb.loginModal();
      }
    }

    // lần đầu + subscribe
    (async () => { renderUser(await NINI.fb.getCurrentUser?.()); })();
    NINI.fb.onAuthChange?.(renderUser);
  }

  // public: mount
  H.mount = function mount(selector, opts = {}) {
    const host = document.querySelector(selector);
    if (!host) return;
    host.innerHTML = html(opts);

    // styles nhỏ cho header (thêm vào base.css của bạn cũng được)
    if (!document.getElementById('nini-header-inline-css')) {
      const css = document.createElement('style');
      css.id = 'nini-header-inline-css';
      css.textContent = `
        .nini-header{width:min(1080px,92vw);margin:12px auto;padding:8px 12px;border-radius:14px;
          border:1px solid var(--glass-brd,#ffffff3a);background:var(--glass-bg,#ffffff12);backdrop-filter:blur(8px);
          display:flex;align-items:center;justify-content:space-between;gap:14px}
        .nini-header .brand{display:flex;align-items:center;gap:10px;font-weight:700}
        .nini-header .tabs{display:flex;gap:8px}
        .nini-header .tabs button{padding:6px 10px;border-radius:999px;border:1px solid var(--glass-brd,#ffffff3a);background:rgba(255,255,255,.08);cursor:pointer}
        .nini-header .user-slot .chip{padding:6px 10px;border-radius:999px;border:1px solid var(--glass-brd,#ffffff3a);background:rgba(255,255,255,.08);cursor:pointer}
      `;
      document.head.appendChild(css);
    }

    bindInteractions(host, opts);
    applySeasonFromHash();
  };
})();
