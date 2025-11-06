/* header-tab.js — Header (logo + slogan + tabs) với SAFE INIT GUARD
 * - Render vào #nini_header
 * - Không gắn trùng listener / không render nhiều lần
 * - Điều hướng qua hash: #/Gioithieu | #/Luatchoi | #/Diendan | #/Lienhe
 * - [ADMIN] Alt + A để hiện/ẩn nút Admin; click → /admin/login.html
 */
(() => {
  const GUARD = '__NINI_HEADER_INIT__';
  if (window[GUARD]) return;
  window[GUARD] = true;

  const N = window.NINI || (window.NINI = {});
  const ROOT_ID = 'nini_header';

  // [ADMIN] cấu hình
  const ADMIN_HREF = '/admin/login.html';
  const HOTKEY_KEY = 'a';

  const TABS = [
    { key: 'Gioithieu', label: 'Giới thiệu', href: '#/Gioithieu' },
    { key: 'Luatchoi',  label: 'Luật chơi',  href: '#/Luatchoi'  },
    { key: 'Diendan',   label: 'Diễn đàn',   href: '#/Diendan'   },
    { key: 'Lienhe',    label: 'Liên hệ',    href: '#/Lienhe'    },
  ];

  function activeKeyFromHash() {
    const h = location.hash || '';
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
              <span class="brand-slogan">chơi mê ly, bứt phá tư duy</span>
            </div>
          </a>
        </div>

        <nav class="nh-nav" aria-label="Điều hướng chính">
          ${TABS.map(t => `
            <a class="pill ${t.key === active ? 'active' : ''}"
               data-key="${t.key}" href="${t.href}">${t.label}</a>
          `).join('')}
          <!-- [ADMIN] nút admin ẩn mặc định -->
          <a id="adminPill"
             class="pill admin"
             href="${ADMIN_HREF}"
             style="display:none"
             aria-label="Trang quản trị">Admin</a>
        </nav>

        <div class="nh-right" id="headerAuthDock">
          <!-- auth-boot.js sẽ gắn nút Đăng nhập/Avatar vào đây -->
        </div>
      </div>
    `;
  }

  function bind(root) {
    // Event delegation cho pills (hash tabs)
    root.addEventListener('click', (e) => {
      const a = e.target.closest('.nh-nav .pill');
      if (!a) return;

      // Nếu là nút admin thì để trình duyệt điều hướng sang /admin/login.html
      if (a.id === 'adminPill') return;

      // Còn lại là hash tabs → đặt active ngay để mượt
      const key = a.dataset.key;
      if (!key) return;
      root.querySelectorAll('.nh-nav .pill').forEach(el => {
        if (el.id !== 'adminPill') {
          el.classList.toggle('active', el.dataset.key === key);
        }
      });
    });

    // Đồng bộ “active” khi hash đổi
    window.addEventListener('hashchange', () => {
      const key = activeKeyFromHash();
      root.querySelectorAll('.nh-nav .pill').forEach(el => {
        if (el.id !== 'adminPill') {
          el.classList.toggle('active', el.dataset.key === key);
        }
      });
    }, { passive: true });

    // [ADMIN] Hotkey Alt + A để toggle nút Admin
    const adminPill = root.querySelector('#adminPill');
    document.addEventListener('keydown', (e) => {
      // tránh khi đang gõ trong input/textarea/contenteditable
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;

      if (e.altKey && e.key.toLowerCase() === HOTKEY_KEY) {
        e.preventDefault();
        if (!adminPill) return;
        const show = adminPill.style.display === 'none';
        adminPill.style.display = show ? 'inline-flex' : 'none';
      }
    }, { passive: false });
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
