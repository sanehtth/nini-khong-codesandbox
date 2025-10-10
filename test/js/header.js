(() => {
  function tpl() {
    return `
      <div class="nini-header">
        <div class="brand">
          <img class="logo" src="/public/assets/icons/logo_text.webp" alt="NiNi" />
          <span class="slogan">Chơi mê ly, bứt phá tư duy</span>
        </div>

        <nav class="tabs">
          <button data-to="home">Home</button>
          <button data-to="spring">Spring</button>
          <button data-to="summer">Summer</button>
          <button data-to="autumn">Autumn</button>
          <button data-to="winter">Winter</button>
        </nav>

        <div class="userbox" id="niniUserBox">
          <img class="avatar" src="/public/assets/avatar/NV.webp" alt="avatar" />
          <button class="btn" id="btnAuthOpen">Đăng nhập / Đăng ký</button>
        </div>
      </div>
    `;
  }

  function mountHeader(root) {
    const el = typeof root === 'string' ? document.querySelector(root) : root;
    el.innerHTML = tpl();

    // Điều hướng 5 tab (UI)
    el.querySelectorAll('.tabs [data-to]').forEach(b => {
      b.addEventListener('click', () => {
        const key = b.dataset.to;
        document.body.classList.remove('home','spring','summer','autumn','winter');
        document.body.classList.add(key);
        NINI.emit('route:change', key);
      });
    });

    // Mở modal Auth
    el.querySelector('#btnAuthOpen').addEventListener('click', () => {
      NINI.emit('auth:open', { mode: 'login' });
    });

    // Khi đăng nhập xong (sau này adapter phát sự kiện)
    NINI.on('auth:changed', (u) => {
      const box = el.querySelector('#niniUserBox');
      if (u) {
        box.innerHTML = `
          <img class="avatar" src="${u.photoURL || '/public/assets/avatar/NV.webp'}" alt="">
          <span class="email">${u.email}</span>
          <button class="btn" id="btnLogout">Đăng xuất</button>`;
        box.querySelector('#btnLogout').onclick = () => NINI.api.logout?.();
      } else {
        box.innerHTML = `
          <img class="avatar" src="/public/assets/avatar/NV.webp" alt="">
          <button class="btn" id="btnAuthOpen">Đăng nhập / Đăng ký</button>`;
        box.querySelector('#btnAuthOpen').onclick = () => NINI.emit('auth:open',{mode:'login'});
      }
    });
  }

  NINI.mount.header = mountHeader;
})();
