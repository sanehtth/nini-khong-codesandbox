/* header.js — safe render */
(function () {
  // đợi DOM sẵn sàng
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(() => {
    // chuẩn bị namespace (không bắt buộc, để tương thích code khác)
    const N = (window.NINI = window.NINI || {});

    // tìm đúng chỗ gắn
    const root = document.getElementById('nini_header');
    if (!root) {
      console.warn('[header] Không tìm thấy #nini_header');
      return;
    }

    // render nội dung header (bạn đổi HTML ở đây tùy ý)
    root.innerHTML = `
      <div class="nini-header-wrap">
        <div class="brand">NiNi — Funny</div>
        <nav class="nav">
          <a href="/" class="nav-link">Trang chủ</a>
          <a href="/#rules" class="nav-link">Luật chơi</a>
        </nav>
        <div class="userbox">
          <button id="btnAuthOpen" class="btn-auth" type="button">Đăng nhập / Đăng ký</button>
        </div>
      </div>
    `;

    // nút mở modal (fallback mở trực tiếp + vẫn emit cho nơi khác nếu có)
    const openBtn = document.getElementById('btnAuthOpen');
    if (openBtn) {
      openBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const m = document.getElementById('authModal');
        if (m) {
          m.classList.remove('hidden');
          m.setAttribute('aria-hidden', 'false');
          document.body.classList.add('body-auth-open');
        }
        N.emit && N.emit('auth:open');
      });
    }
  });
})();
