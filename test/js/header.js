// /public/js/nini-header.js
export function mountHeader(target, opts = {}) {
  const {
    routes = ['home','spring','summer','autumn','winter'],
    defaultRoute = 'home',
    showSeasons = true,                  // << NEW
  } = opts;

  const host = document.querySelector(target);
  if (!host) return;

  host.innerHTML = `
    <div class="nini-header shell">
      <a class="brand" href="#/home" aria-label="NiNi — Funny">
        <img class="brand__logo" src="/public/assets/icons/logo_text.webp" alt="NiNi Funny" />
        <div class="brand__slogan">Chơi mê ly, bứt phá tư duy</div>
      </a>

      ${showSeasons ? `
      <nav class="season-tabs" aria-label="Chọn mùa">
        ${routes.map((r,i)=>`<button class="season-tab${i===0?' is-active':''}" data-season="${r}">${r[0].toUpperCase()+r.slice(1)}</button>`).join('')}
      </nav>` : ''}

      <div class="auth-area">
        <button class="auth-btn" data-role="btn-login" data-show="out">Đăng nhập / Đăng ký</button>
        <a class="avatar-btn" data-show="in" href="/profile.html" style="display:none" title="Hồ sơ">
          <img class="avatar-img" src="/public/assets/avatar/NV1.webp" alt="Tài khoản">
        </a>
        <button class="auth-btn" data-role="btn-logout" data-show="in" style="display:none">Đăng xuất</button>
        <a id="adminBtn" class="admin-link is-hidden" href="/admin/login.html" rel="noopener">Admin</a>
      </div>
    </div>
  `;

  // nếu có tabs thì mới gán handler
  if (showSeasons) {
    const tabs = host.querySelectorAll('.season-tab');
    tabs.forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const s = btn.dataset.season;
        tabs.forEach(b=>b.classList.toggle('is-active', b===btn));
        // thông báo ra ngoài (để app 16:9 đổi nền, v.v.)
        window.dispatchEvent(new CustomEvent('nini:season', { detail: { season: s }}));
        const newHash = `#/${s}`;
        if (location.hash !== newHash) history.replaceState({}, "", newHash);
      });
    });
    // khởi tạo hash
    if (!location.hash) history.replaceState({}, "", `#/${defaultRoute}`);
  }

  // …(phần đăng nhập/đăng xuất giữ nguyên như trước của bạn)…
}
