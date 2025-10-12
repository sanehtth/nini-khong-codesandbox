;(() => {
  const N = window.NINI;

  function renderStage(root){
    root.innerHTML = `
      <div class="hero">
        <h1>Chào mừng đến với NiNi — Funny</h1>
        <p>Dùng thanh trên để chuyển mùa, đăng nhập/đăng ký, hoặc đặt lại mật khẩu.</p>
      </div>
      <div class="links">
        <a class="btn ghost" href="#/about">Giới thiệu</a>
        <a class="btn ghost" href="#/rules">Luật chơi</a>
        <a class="btn ghost" href="#/forum">Diễn đàn</a>
        <a class="btn ghost" href="#/feedback">Góp ý</a>
      </div>
    `;
  }

  function renderSeasonsNav(nav){
    nav.innerHTML = `
      <button data-season="spring">Xuân</button>
      <button data-season="summer">Hạ</button>
      <button data-season="autumn">Thu</button>
      <button data-season="winter">Đông</button>
    `;
    nav.addEventListener('click', (e)=>{
      const btn = e.target.closest('[data-season]');
      if (!btn) return;
      N.setSeason(btn.dataset.season);
    });
  }

  N.mountOnce('#stage', renderStage);
  N.mountOnce('#season_nav', renderSeasonsNav);
})();
