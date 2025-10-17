// ===== SAFE INIT GUARD (header-tab.js) =====
if (!window.__HEADER_TABS_INIT__) {
  window.__HEADER_TABS_INIT__ = true;

  const root = document.getElementById('nini_header');
  if (root) {
    // Replace, không append
    root.innerHTML = `
      <div class="header-bar">
        <div class="logo">NiNi — Funny</div>
        <nav class="tabs">
          <a href="#/Gioithieu">Giới thiệu</a>
          <a href="#/Luatchoi">Luật chơi</a>
          <a href="#/Diendan">Diễn đàn</a>
          <a href="#/Lienhe">Liên hệ</a>
          <button id="nini-login-pill" class="login-pill">Đăng nhập</button>
        </nav>
      </div>
      <div id="header-card"></div>
    `;

    // Delegation 1 lần cho tab
    root.addEventListener('click', (e) => {
      const link = e.target.closest('a[href^="#/"]');
      if (!link) return;
      // Router đã lắng nghe hashchange trong app-shell.js
    });
  }
}
