<script>
/*!
 * Header tách rời — không phụ thuộc cứng vào FB SDK.
 * Nếu có window.NINI.fb thì tự gắn user và logout; nếu không thì chỉ mở event 'nini:auth:open'.
 */
(function (W) {
  const G = (sel, root = document) => root.querySelector(sel);

  function makeEl(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  function activeForHash(hash) {
    try {
      const h = (hash || location.hash || '').toLowerCase();
      if (h.includes('spring')) return 'spring';
      if (h.includes('summer')) return 'summer';
      if (h.includes('autumn')) return 'autumn';
      if (h.includes('winter')) return 'winter';
      return 'home';
    } catch { return 'home'; }
  }

  function renderHeader(opts = {}) {
    const routes = opts.routes || ['home','spring','summer','autumn','winter'];
    const logoLeft  = opts.logoLeft  || '/public/assets/icons/logo_text.webp';
    const logoSmall = opts.logoSmall || '/public/assets/icons/logonini.webp';

    const el = makeEl(`
      <div class="c-header">
        <div class="brand">
          <img class="logo-left"  src="${logoLeft}"  alt="NiNi" />
          <span>Chơi mê ly, bứt phá tư duy</span>
        </div>

        <nav class="tabs">
          ${routes.map(r => {
            const label = r[0].toUpperCase() + r.slice(1);
            return `<a class="tab" data-route="${r}" href="#/${r}">${label}</a>`;
          }).join('')}
        </nav>

        <div class="user">
          <img class="avatar" src="${logoSmall}" alt="avatar" />
          <span class="email" id="niniUserMail" style="display:none;"></span>
          <button class="btn" id="btnAuth">Đăng nhập / Đăng ký</button>
          <button class="btn" id="btnLogout" style="display:none;">Đăng xuất</button>
        </div>
      </div>
    `);

    // mark tab active
    function markActive() {
      const cur = activeForHash();
      el.querySelectorAll('.tab').forEach(a => {
        a.classList.toggle('is-active', a.dataset.route === cur);
      });
    }
    markActive();
    W.addEventListener('hashchange', markActive);

    // auth buttons
    const btnAuth   = G('#btnAuth', el);
    const btnLogout = G('#btnLogout', el);
    const emailBox  = G('#niniUserMail', el);
    const avatarImg = G('.avatar', el);

    btnAuth.addEventListener('click', () => {
      // Nếu có SDK: mở modal; nếu không: phát event cho app tự bắt
      if (W.NINI?.fb?.openAuth) { W.NINI.fb.openAuth(); }
      else W.dispatchEvent(new CustomEvent('nini:auth:open'));
    });

    btnLogout.addEventListener('click', async () => {
      try {
        await W.NINI?.fb?.logout?.();
      } catch (e) {
        alert('Không đăng xuất được: ' + (e?.message || e));
      }
    });

    // hydrate user nếu FB có expose
    function applyUser(u) {
      const has = !!u;
      emailBox.style.display = has ? '' : 'none';
      btnAuth.style.display   = has ? 'none' : '';
      btnLogout.style.display = has ? '' : 'none';
      if (has) {
        emailBox.textContent = u.email || 'User';
        if (u.photoURL) avatarImg.src = u.photoURL;
      } else {
        emailBox.textContent = '';
        avatarImg.src = logoSmall;
      }
    }

    // 1) lấy user hiện tại nếu có
    try { applyUser(W.NINI?.fb?.getCurrentUser?.()); } catch {}
    // 2) subscribe thay đổi
    try { W.NINI?.fb?.onUserChanged?.(applyUser); } catch {}

    return el;
  }

  const api = {
    mount(selector = '#mini_header', opts = {}) {
      const root = typeof selector === 'string' ? G(selector) : selector;
      if (!root) return console.warn('[header] mount: không tìm thấy', selector);
      root.innerHTML = '';
      root.appendChild(renderHeader(opts));
    }
  };

  W.NINI = W.NINI || {};
  W.NINI.header2 = api;
})(window);
</script>
