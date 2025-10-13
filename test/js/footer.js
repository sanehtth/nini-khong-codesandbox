// footer.js — mount footer chips dưới cùng trang
(function () {
  const N = (window.NINI = window.NINI || {});
  if (N._wiredFooter) return;
  N._wiredFooter = true;

  function mount(sel = '#nini_footer') {
    let root = document.querySelector(sel);
    if (!root) {
      root = document.createElement('footer');
      root.id = 'nini_footer';
      document.body.appendChild(root);
    }

    root.innerHTML = `
      <div class="nini-footer">
        <nav class="soft-tabs" aria-label="Liên kết nhanh">
          <a class="chip" href="/#/intro">Giới thiệu</a>
          <a class="chip" href="/#/rules">Luật chơi</a>
          <a class="chip" href="/#/forum">Diễn đàn</a>
          <a class="chip" href="/#/feedback">Góp ý</a>
        </nav>
        <div class="copyright">© NiNi — Funny</div>
      </div>
    `;

    // Nếu có modal auth mở -> tạm ẩn footer cho đỡ chồng
    const hideWhenAuthOpen = () => {
      const opened = document.body.classList.contains('body-auth-open');
      root.style.pointerEvents = opened ? 'none' : '';
      root.style.opacity = opened ? '.0' : '';
    };

    // nghe event nội bộ (đã có trong header/auth)
    if (N.on) {
      N.on('auth:open', hideWhenAuthOpen);
      N.on('auth:close', hideWhenAuthOpen);
    }
    // fallback theo class
    const mo = new MutationObserver(hideWhenAuthOpen);
    mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    hideWhenAuthOpen();
    return root;
  }

  N.footer = { mount };

  if (document.readyState !== 'loading') mount();
  else document.addEventListener('DOMContentLoaded', () => mount());
})();
