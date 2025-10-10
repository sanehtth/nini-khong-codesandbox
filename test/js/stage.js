(() => {
  function mountStage(root) {
    const el = typeof root === 'string' ? document.querySelector(root) : root;
    el.innerHTML = `
      <section class="glass">
        <h1>Chào mừng đến với NiNi — Funny</h1>
        <p>Dùng thanh trên để chuyển mùa, đăng nhập/đăng ký, hoặc đặt lại mật khẩu.</p>
      </section>
      <nav class="soft-tabs">
        <a href="#about">Giới thiệu</a>
        <a href="#rules">Luật chơi</a>
        <a href="#forum">Diễn đàn</a>
        <a href="#feedback">Góp ý</a>
      </nav>
    `;
  }
  NINI.mount.stage = mountStage;
})();
