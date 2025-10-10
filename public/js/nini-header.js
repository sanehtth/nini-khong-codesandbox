/*! NiNi Header (non-module) */
(function () {
  const W = window;
  W.NINI = W.NINI || {};
  const FB = (W.NINI && W.NINI.fb) || null;

  function h(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  function renderHeader(opts) {
    const box = h(`
      <header class="nini-header">
        <div class="brand">
          <img class="logo" src="/public/assets/icons/logo_text.webp" alt="NiNi">
          <span class="slogan">Chơi mê lý, bứt phá tư duy</span>
        </div>

        <nav class="tabs" role="tablist">
          <button data-to="home">Home</button>
          <button data-to="spring">Spring</button>
          <button data-to="summer">Summer</button>
          <button data-to="autumn">Autumn</button>
          <button data-to="winter">Winter</button>
        </nav>

        <div class="userbox" id="niniUserBox">
          <img class="avatar" id="niniAvatar" src="/public/assets/avatar/NNI.webp" alt="avatar">
          <span class="email" id="niniEmail"></span>
          <button class="btn btn-primary" id="btnAuthOpen" data-open-auth="login">Đăng nhập / Đăng ký</button>
          <button class="btn btn-primary" id="btnLogout" style="display:none">Đăng xuất</button>
        </div>
      </header>
    `);

    // gắn click tab
    const routes = (opts && opts.routes) || {};
    box.querySelectorAll('.tabs [data-to]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const key = btn.dataset.to;
        const url = routes[key] || `#/${key}`;
        if (typeof opts?.onNavigate === 'function') opts.onNavigate(key, url);
        else location.hash = url;
        // set class body theo mùa
        document.body.classList.remove('spring','summer','autumn','winter');
        if (['spring','summer','autumn','winter'].includes(key)) {
          document.body.classList.add(key);
        }
      });
    });

    // mở modal
    box.querySelector('#btnAuthOpen')?.addEventListener('click', ()=>{
      W.NINI?.authModal?.show('login');
    });

    // logout
    box.querySelector('#btnLogout')?.addEventListener('click', async ()=>{
      try {
        if (!FB?.logout) throw new Error('FB API missing: logout');
        await FB.logout();
      } catch(e) { alert('Không đăng xuất được: '+(e?.message||e)); }
    });

    // cập nhật UI theo user
    function applyUser(u){
      const $email = box.querySelector('#niniEmail');
      const $avatar = box.querySelector('#niniAvatar');
      const $btnOpen = box.querySelector('#btnAuthOpen');
      const $btnOut  = box.querySelector('#btnLogout');

      if (u) {
        $email.textContent = u.email || '';
        $avatar.src = u.photoURL || '/public/assets/avatar/NNI.webp';
        $btnOpen.style.display = 'none';
        $btnOut.style.display = '';
      } else {
        $email.textContent = '';
        $avatar.src = '/public/assets/avatar/NNI.webp';
        $btnOpen.style.display = '';
        $btnOut.style.display = 'none';
      }
    }

    // subscribe login state
    if (FB?.onUserChanged) FB.onUserChanged(applyUser);
    else applyUser(null);

    return box;
  }

  function renderAuthModal(){
    const modal = h(`
      <div id="nini-auth" class="nini-auth">
        <div class="panel">
          <div class="tabs">
            <button data-to="login" class="active">Đăng nhập</button>
            <button data-to="register">Đăng ký</button>
            <button data-to="reset">Quên mật khẩu</button>
          </div>

          <div data-view="login" class="active">
            <div class="row">
              <input id="lgEmail" type="email" placeholder="you@example.com" autocomplete="username" />
              <input id="lgPass" type="password" placeholder="Mật khẩu" autocomplete="current-password" />
            </div>
            <div class="actions">
              <button class="btn btn-primary" id="btnLogin">OK</button>
            </div>
          </div>

          <div data-view="register">
            <div class="row">
              <input id="rgEmail" type="email" placeholder="you@example.com" autocomplete="username" />
              <input id="rgPass" type="password" placeholder="Mật khẩu (>=6 ký tự)" autocomplete="new-password" />
              <input id="rgName" type="text" placeholder="Tên hiển thị" />
            </div>
            <div class="actions">
              <button class="btn btn-primary" id="btnRegister">Tạo tài khoản</button>
            </div>
          </div>

          <div data-view="reset">
            <div class="row">
              <input id="rsEmail" type="email" placeholder="you@example.com" autocomplete="username" />
            </div>
            <div class="actions">
              <button class="btn btn-primary" id="btnSendReset">Gửi link đặt lại</button>
            </div>
          </div>

          <button class="close" data-auth="close">Đóng</button>
        </div>
      </div>
    `);

    // switch tab
    function show(name){
      modal.classList.add('open');
      modal.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('active', b.dataset.to===name));
      modal.querySelectorAll('[data-view]').forEach(v=>v.classList.toggle('active', v.dataset.view===name));
    }
    modal.querySelectorAll('.tabs button').forEach(b=>{
      b.addEventListener('click', ()=>show(b.dataset.to));
    });

    // close
    modal.querySelector('[data-auth="close"]').addEventListener('click', ()=> modal.classList.remove('open'));

    // buttons
    modal.querySelector('#btnLogin').addEventListener('click', async ()=>{
      try {
        if (!FB?.loginEmailPassword) throw new Error('FB API missing: loginEmailPassword');
        const email = modal.querySelector('#lgEmail').value.trim();
        const pass  = modal.querySelector('#lgPass').value;
        await FB.loginEmailPassword(email, pass);
        modal.classList.remove('open');
      } catch(e) { alert('Đăng nhập lỗi: '+(e?.message||e)); }
    });

    modal.querySelector('#btnRegister').addEventListener('click', async ()=>{
      try {
        if (!FB?.registerEmailPass) throw new Error('FB API missing: registerEmailPass');
        const email = modal.querySelector('#rgEmail').value.trim();
        const pass  = modal.querySelector('#rgPass').value;
        const name  = modal.querySelector('#rgName').value.trim();
        await FB.registerEmailPass(email, pass, name);
        modal.classList.remove('open');
      } catch(e) { alert('Đăng ký lỗi: '+(e?.message||e)); }
    });

    modal.querySelector('#btnSendReset').addEventListener('click', async ()=>{
      try {
        if (!FB?.resetPassword) throw new Error('FB API missing: resetPassword');
        const email = modal.querySelector('#rsEmail').value.trim();
        await FB.resetPassword(email);     // bạn đang map về /auth-action.html ở serverless
        alert('Đã gửi link đặt lại mật khẩu (nếu email tồn tại).');
        modal.classList.remove('open');
      } catch(e) { alert('Không gửi được email: '+(e?.message||e)); }
    });

    // public API
    W.NINI.authModal = {
      show(tab='login'){ show(tab); },
      close(){ modal.classList.remove('open'); }
    };
    return modal;
  }

  function mount(selector, opts={}) {
    const host = (typeof selector === 'string') ? document.querySelector(selector) : selector;
    if (!host) return;

    // header
    host.replaceChildren(renderHeader(opts));
    // modal – attach 1 lần vào body
    if (!document.getElementById('nini-auth')) {
      document.body.appendChild(renderAuthModal());
    }

    // season mặc định
    const s = (opts.defaultSeason || 'spring');
    if (['spring','summer','autumn','winter'].includes(s)) {
      document.body.classList.add(s);
    }
  }

  W.NINI.header = { mount };
})();
