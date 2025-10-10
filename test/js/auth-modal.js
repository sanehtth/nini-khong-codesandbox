(() => {
  const modal = document.createElement('div');
  modal.className = 'auth-modal hidden';
  modal.innerHTML = `
    <div class="auth-card">
      <div class="auth-tabs">
        <button data-mode="login"  class="active">Đăng nhập</button>
        <button data-mode="register">Đăng ký</button>
        <button data-mode="reset">Quên mật khẩu</button>
      </div>
      <div class="auth-body"></div>
      <div class="auth-actions">
        <button id="authClose">Đóng</button>
        <button id="authSubmit">OK</button>
      </div>
    </div>`;
  document.body.appendChild(modal);

  let mode = 'login';

  function renderBody() {
    const body = modal.querySelector('.auth-body');
    if (mode === 'login') {
      body.innerHTML = `
        <label>Email</label><input id="loginEmail" type="email" placeholder="you@example.com" />
        <label>Mật khẩu</label><input id="loginPass" type="password" placeholder="Mật khẩu" />
        <button id="loginGoogle">Đăng nhập Google</button>
      `;
    } else if (mode === 'register') {
      body.innerHTML = `
        <label>Email</label><input id="regEmail" type="email" placeholder="you@example.com" />
        <label>Mật khẩu (>=6)</label><input id="regPass" type="password" placeholder="Mật khẩu" />
        <label>Tên hiển thị</label><input id="regName" type="text" placeholder="Bé NiNi" />
      `;
    } else {
      body.innerHTML = `
        <label>Email</label><input id="resetEmail" type="email" placeholder="you@example.com" />
        <small>Chúng mình sẽ gửi liên kết đặt lại mật khẩu.</small>
      `;
    }
  }

  // Tab click
  modal.querySelectorAll('.auth-tabs [data-mode]').forEach(b=>{
    b.onclick = () => {
      modal.querySelectorAll('.auth-tabs button').forEach(x=>x.classList.remove('active'));
      b.classList.add('active'); mode = b.dataset.mode; renderBody();
    };
  });

  // Submit
  modal.querySelector('#authSubmit').onclick = async () => {
    try {
      if (mode === 'login') {
        const email = modal.querySelector('#loginEmail').value.trim();
        const pass  = modal.querySelector('#loginPass').value.trim();
        await NINI.api.login?.(email, pass);
      } else if (mode === 'register') {
        const email = modal.querySelector('#regEmail').value.trim();
        const pass  = modal.querySelector('#regPass').value.trim();
        const name  = modal.querySelector('#regName').value.trim();
        await NINI.api.register?.(email, pass, name);
      } else {
        const email = modal.querySelector('#resetEmail').value.trim();
        await NINI.api.sendReset?.(email);
      }
      close();
    } catch (e) { alert(e.message || e); }
  };

  modal.querySelector('#authClose').onclick = close;
  function close(){ modal.classList.add('hidden'); }

  // Mở modal từ header
  NINI.on('auth:open', ({mode: m}) => {
    mode = m || 'login';
    modal.querySelectorAll('.auth-tabs button').forEach(x=>x.classList.toggle('active', x.dataset.mode===mode));
    renderBody();
    modal.classList.remove('hidden');
  });
})();
