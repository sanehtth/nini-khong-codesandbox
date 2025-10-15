/* auth-modal.js — Modal Đăng nhập/Đăng ký/Quên mật khẩu
   - Tự tạo dock #authDock nếu chưa có
   - Không crash khi chưa có phần tử
   - Mở/đóng an toàn, luôn gỡ blur khi đóng
   - Xuất API: window.NiNiAuth.open(tab?), window.NiNiAuth.close()
*/

(function () {
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  // ============= Mount dock =============
  let dock = $('#authDock');
  if (!dock) {
    dock = document.createElement('div');
    dock.id = 'authDock';
    document.body.appendChild(dock);
  }

  // ============= Render modal =============
  const html = `
  <div class="auth-modal" role="dialog" aria-modal="true" hidden>
    <div class="auth-backdrop" data-close="1"></div>
    <div class="auth-box glass">
      <div class="auth-head">
        <button class="tab in" data-tab="login">Đăng nhập</button>
        <button class="tab" data-tab="signup">Đăng ký</button>
        <button class="tab" data-tab="reset">Quên mật khẩu</button>
        <button class="x" id="btnAuthClose" aria-label="Đóng">×</button>
      </div>
      <div class="msg" aria-live="polite"></div>
      <div class="auth-body">
        <form id="formLogin"   class="pane in" data-pane="login"  autocomplete="on">
          <label>Email</label><input id="loginEmail" type="email" required />
          <label>Mật khẩu</label><input id="loginPass" type="password" required />
          <button type="submit" class="primary">Đăng nhập</button>
        </form>

        <form id="formSignup"  class="pane" data-pane="signup" autocomplete="on">
          <label>Email</label><input id="signupEmail" type="email" required />
          <label>Mật khẩu</label><input id="signupPass" type="password" required />
          <button type="submit" class="primary">Tạo tài khoản</button>
        </form>

        <form id="formReset"   class="pane" data-pane="reset">
          <label>Email</label><input id="resetEmail" type="email" required />
          <button type="submit" class="primary">Gửi link đặt lại mật khẩu</button>
        </form>
      </div>
    </div>
  </div>`;

  dock.innerHTML = html;
  const modal     = $('.auth-modal', dock);
  const box       = $('.auth-box', modal);
  const msgBox    = $('.msg', modal);
  const tabs      = $$('.auth-head .tab', modal);

  function setMsg(t) { msgBox.textContent = t || ''; }

  function switchTab(name) {
    tabs.forEach(b => b.classList.toggle('in', b.dataset.tab === name));
    $$('.pane', modal).forEach(p => p.classList.toggle('in', p.dataset.pane === name));
  }

  // ============= Open/Close =============
  function openModal(tab = 'login') {
    switchTab(tab);
    modal.hidden = false;
    document.body.classList.add('body-auth-open'); // chỉ blur khi MỞ
    setTimeout(() => $('#loginEmail').focus(), 10);
  }

  function closeModal() {
    modal.hidden = true;
    document.body.classList.remove('body-auth-open'); // GỠ BLUR CHẮC CHẮN
    setMsg('');
  }

  // Expose API
  window.NiNiAuth = window.NiNiAuth || {};
  window.NiNiAuth.open  = openModal;
  window.NiNiAuth.close = closeModal;

  // Delegate
  modal.addEventListener('click', (e) => {
    if (e.target.dataset.close) { closeModal(); }
  });
  $('#btnAuthClose', modal).addEventListener('click', closeModal);
  tabs.forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));

  // ESC to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
  });

  // ============= Submit handlers =============
  function validEmail(v){ return /\S+@\S+\.\S+/.test(v); }

  $('#formLogin', modal).addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#loginEmail').value.trim();
    const pass  = $('#loginPass').value;
    if (!validEmail(email)) return setMsg('Email không hợp lệ.');
    setMsg('Đang đăng nhập ...');
    try {
      await window.NiNi?.fb?.signInWithEmailAndPassword(email, pass);
      setMsg('Đăng nhập thành công!');
      closeModal();
    } catch (err) {
      setMsg(err?.message || 'Không đăng nhập được.');
    }
  });

  $('#formSignup', modal).addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#signupEmail').value.trim();
    const pass  = $('#signupPass').value;
    if (!validEmail(email)) return setMsg('Email không hợp lệ.');
    setMsg('Đang tạo tài khoản ...');
    try {
      await window.NiNi?.fb?.createUserWithEmailAndPassword(email, pass);
      setMsg('Tạo tài khoản thành công!');
      closeModal();
    } catch (err) {
      setMsg(err?.message || 'Không tạo được tài khoản.');
    }
  });

  $('#formReset', modal).addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#resetEmail').value.trim();
    if (!validEmail(email)) return setMsg('Email không hợp lệ.');
    setMsg('Đang gửi liên kết ...');
    try {
      await window.NiNi?.fb?.sendPasswordResetEmail(email);
      setMsg('Đã gửi liên kết đặt lại mật khẩu!');
    } catch (err) {
      setMsg(err?.message || 'Không gửi được email.');
    }
  });
})();
