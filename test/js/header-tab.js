/* header-tab.js — Header (logo + slogan + tabs) với SAFE INIT GUARD
 * - Render vào #nini_header
 * - Không gắn trùng listener / không render nhiều lần
 * - Điều hướng qua hash: #/Gioithieu | #/Luatchoi | #/Diendan | #/Lienhe
 */
(() => {
  const GUARD = '__NINI_HEADER_INIT__';
  if (window[GUARD]) return;
  window[GUARD] = true;

  const N = window.NINI || (window.NINI = {});
  const ROOT_ID = 'nini_header';

  const TABS = [
    { key: 'Gioithieu', label: 'Giới thiệu', href: '#/Gioithieu' },
    { key: 'Luatchoi',  label: 'Luật chơi',  href: '#/Luatchoi'  },
    { key: 'Diendan',   label: 'Diễn đàn',   href: '#/Diendan'   },
    { key: 'Lienhe',    label: 'Liên hệ',    href: '#/Lienhe'    },
  ];

  function activeKeyFromHash() {
    const h = location.hash || '';
    // #/Abc → Abc
    const m = h.match(/^#\/([^/?#]+)/);
    return m ? m[1] : 'Gioithieu';
  }

  function render(root) {
    const active = activeKeyFromHash();

    root.innerHTML = `
      <div class="nini-header glass" role="banner">
        <div class="nh-left">
          <a class="brand" href="#/home" aria-label="NiNi — Funny">
            <img class="brand-logo" src="/public/assets/icons/logo_text.webp" alt="" />
            <div class="brand-text">
              <strong class="brand-name">NiNi — Funny</strong>
              <span class="brand-slogan">chơi mê ly, bứt phá tư duy</span>
            </div>
          </a>
        </div>

        <nav class="nh-nav" aria-label="Điều hướng chính">
          ${TABS.map(t => `
            <a class="pill ${t.key === active ? 'active' : ''}" 
               data-key="${t.key}" href="${t.href}">${t.label}</a>
          `).join('')}
        </nav>

        <div class="nh-right" id="headerAuthDock">
          <!-- auth-boot.js sẽ gắn nút Đăng nhập/Avatar vào đây -->
        </div>
      </div>
    `;
  }

  function bind(root) {
    // Event delegation cho pills
    root.addEventListener('click', (e) => {
      const a = e.target.closest('.nh-nav .pill');
      if (!a) return;
      // để cho router xử lý hash, nhưng vẫn set active ngay để mượt
      const key = a.dataset.key;
      root.querySelectorAll('.nh-nav .pill').forEach(el => {
        el.classList.toggle('active', el.dataset.key === key);
      });
      // Không chặn default; hash sẽ thay đổi → app-shell bắt sự kiện
    });

    // Đồng bộ “active” khi người dùng gõ hash tay / back-forward
    window.addEventListener('hashchange', () => {
      const key = activeKeyFromHash();
      root.querySelectorAll('.nh-nav .pill').forEach(el => {
        el.classList.toggle('active', el.dataset.key === key);
      });
    }, { passive: true });
  }

  // Mount một lần
  const holder = document.getElementById(ROOT_ID);
  if (holder) {
    render(holder);
    bind(holder);
  } else {
    console.warn('[header-tab] Không thấy #nini_header');
  }
})();
