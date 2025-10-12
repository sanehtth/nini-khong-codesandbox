;(() => {
  const N = window.NINI;

  function tpl(){return `
    <div class="auth-modal__inner">
      <div class="tabs">
        <button data-tab="login"  class="active">Đăng nhập</button>
        <button data-tab="register">Đăng ký</button>
        <button data-tab="reset">Quên mật khẩu</button>
      </div>

      <div class="panel login">
        <label>Email</label><input id="authEmail" type="email" placeholder="you@example.com"/>
        <label>Mật khẩu</label><input id="authPass"  type="password" placeholder="*******"/>
        <button id="btnLoginGoogle" class="wfull">Đăng nhập Google</button>
      </div>

      <div class="panel register" hidden>
        <label>Email</label><input id="regEmail" type="email" placeholder="you@example.com"/>
        <label>Mật khẩu (>=6 ký tự)</label><input id="regPass" type="password"/>
        <label>Tên hiển thị</label><input id="regName" type="text" placeholder="Bé NiNi"/>
        <button id="btnCreate" class="wfull">Tạo tài khoản</button>
      </div>

      <div class="panel reset" hidden>
        <label>Email</label><input id="resetEmail" type="email" placeholder="you@example.com"/>
        <button id="btnSendReset" class="wfull">Gửi link đặt lại</button>
      </div>

      <div class="actions">
        <button id="btnClose">Đóng</button>
        <button id="btnOk">OK</button>
      </div>
    </div>`;}

  function mount(){
    if (document.getElementById('authModal')) return;
    const wrap = document.createElement('div');
    wrap.id = 'authModal';
    wrap.className = 'auth-modal';
    wrap.setAttribute('aria-hidden','true');
    wrap.innerHTML = tpl();
    document.body.appendChild(wrap);

    const setTab = (name) => {
      wrap.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
      wrap.querySelectorAll('.panel').forEach(p => p.hidden = !p.classList.contains(name));
    };

    wrap.addEventListener('click', (e)=>{
      if (e.target.id === 'btnClose') N.emit('auth:close');
      const t = e.target.closest('[data-tab]');
      if (t) setTab(t.dataset.tab);
    });

    wrap.querySelector('#btnSendReset')?.addEventListener('click', () => {
      const email = wrap.querySelector('#resetEmail').value.trim();
      if (!email) return alert('Nhập email');
      if (N.fb?.sendPasswordResetEmail) {
        N.fb.sendPasswordResetEmail(email).then(()=>alert('Đã gửi link (demo).'))
          .catch(e=>alert(e.message));
      } else {
        alert('Demo: gửi reset qua server riêng của bạn.');
      }
    });

    N.on('auth:open', () => {
      wrap.removeAttribute('aria-hidden');
      document.body.classList.add('modal-open');
    });
    N.on('auth:close', () => {
      wrap.setAttribute('aria-hidden','true');
      document.body.classList.remove('modal-open');
    });
  }

  mount();
})();
