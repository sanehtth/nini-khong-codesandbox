;(() => {
  const N = window.NINI;

  function renderHeader(root){
    root.innerHTML = `
      <div class="brand">
        <img src="/public/assets/icons/logo_text.webp" alt="NiNi" />
        <span class="slogan">Chơi mê ly, bật phá tư duy</span>
      </div>
      <nav class="tabs">
        <button data-go="home">Home</button>
        <button data-go="spring">Spring</button>
        <button data-go="summer">Summer</button>
        <button data-go="autumn">Autumn</button>
        <button data-go="winter">Winter</button>
      </nav>
      <div class="userbox">
        <img class="avatar" src="/public/assets/avatar/NV.webp" alt="avatar"/>
        <span class="email" id="miniEmail">Bạn chưa đăng nhập</span>
        <button id="btnAuthOpen" class="btn">Đăng nhập / Đăng ký</button>
        <button id="btnLogout"   class="btn" style="display:none">Đăng xuất</button>
      </div>
    `;

    // điều hướng “mùa”
    root.querySelectorAll('[data-go]').forEach(btn=>{
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-go');
        if (['spring','summer','autumn','winter'].includes(key)) {
          N.setSeason(key);
          location.hash = '#/' + key;
        } else {
          location.hash = '#/home';
        }
      });
    });

    // mở modal
    root.querySelector('#btnAuthOpen').addEventListener('click', () => N.emit('auth:open'));

    // đăng xuất (nếu có NINI.fb)
    root.querySelector('#btnLogout').addEventListener('click', async () => {
      if (N.fb?.logout) {
        try { await N.fb.logout(); location.reload(); }
        catch(e){ alert('Không đăng xuất được: ' + e.message); }
      } else {
        alert('Demo logout!');
      }
    });
  }

  N.mountOnce('#mini_header', renderHeader);
})();
