<!-- /public/theme/nini-header.js -->
(function (global) {
  const KEY_SEASON = 'NINI_THEME_SEASON';

  function setSeasonClass(season) {
    const all = ['home','spring','summer','autumn','winter'];
    const s = all.includes(season) ? season : 'spring';
    document.body.classList.remove(...all);
    document.body.classList.add(s);
  }

  function detectSeasonFromUrl() {
    const p = location.pathname.replace(/\/+$/,'');
    if (p === '' || p === '/') return 'home';
    if (/\/spring$/.test(p))  return 'spring';
    if (/\/summer$/.test(p))  return 'summer';
    if (/\/autumn$/.test(p))  return 'autumn';
    if (/\/winter$/.test(p))  return 'winter';
    return localStorage.getItem(KEY_SEASON) || 'spring';
  }

  function mount(selector, opts = {}) {
    const root = document.querySelector(selector);
    if (!root) return;

    // 1) quyết định mùa
    let season = (opts.season === 'auto')
      ? detectSeasonFromUrl()
      : (opts.season || localStorage.getItem(KEY_SEASON) || 'spring');

    setSeasonClass(season);

    // 2) render header
    root.innerHTML = `
      <div class="nini-header glass">
        <div class="brand">
          <a class="logo" href="/">NiNi</a>
          <span class="slogan">Chơi mê ly, bứt phá tư duy</span>
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

    // 3) click tab
    const go = (s) => {
      localStorage.setItem(KEY_SEASON, s);
      setSeasonClass(s);
      if (opts.routes && opts.onNavigate) {
        const href = opts.routes[s] || '/';
        // nếu bạn muốn chỉ đổi class không điều hướng thì comment dòng dưới
        opts.onNavigate(href);
      }
    };
    root.querySelectorAll('[data-s]').forEach(b=>{
      b.addEventListener('click', ()=> go(b.dataset.s));
    });

    // 4) auth slot (dựa trên nini-fb.js)
    const applyUser = (user) => {
      const box = root.querySelector('#niniUserSlot');
      if (!box) return;
      if (user) {
        box.innerHTML = `
          <div class="user glass">
            <img class="ava" src="${user.photoURL || '/public/assets/avatar/NV1.webp'}" alt="">
            <span class="email">${user.email}</span>
            <button class="btn small" id="btnLogout">Đăng xuất</button>
          </div>`;
        box.querySelector('#btnLogout')?.addEventListener('click', ()=> global.NINI?.fb?.logout?.());
      } else {
        box.innerHTML = `<button class="btn" id="btnLogin">Đăng nhập / Đăng ký</button>`;
        box.querySelector('#btnLogin')?.addEventListener('click', ()=> global.NINI?.fb?.loginModal?.());
      }
    };

    // lần đầu: nếu nini-fb đã sẵn sàng
    if (global.NINI?.fb?.getCurrentUser) applyUser(global.NINI.fb.getCurrentUser());
    // lắng trạng thái
    global.NINI = global.NINI || {};
    global.NINI.__applyUser = applyUser; // cho nini-fb gọi lại
  }

  // expose
  global.NINI = global.NINI || {};
  global.NINI.header = { mount };
})(window);


/* header tối giản — dùng chung */
.nini-header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px;border-radius:16px;margin:8px auto;max-width:1100px}
.nini-header .brand{display:flex;align-items:baseline;gap:10px;font-weight:700}
.nini-header .brand .logo{font-weight:900;text-decoration:none}
.nini-header .tabs{display:flex;gap:8px}
.nini-header .tabs button{border:0;padding:8px 12px;border-radius:999px;cursor:pointer}
.nini-header .user-slot .user{display:flex;align-items:center;gap:8px;padding:4px 8px;border-radius:999px}
.nini-header .user-slot .ava{width:28px;height:28px;object-fit:cover;border-radius:50%}
.btn{border:0;padding:8px 12px;border-radius:10px;cursor:pointer}
.btn.small{padding:6px 10px;font-size:12px}
.glass{backdrop-filter:blur(6px);background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18)}




