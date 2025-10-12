/* auth-modal.js — full: Modal với 3 tab (login/signup/reset) + submit */
(function () {
  const N = (window.NINI = window.NINI || {});
  if (N._wiredAuthModal) return;
  N._wiredAuthModal = true;

  // ---- Tạo DOM nếu chưa có
  function ensureModal() {
    let m = document.getElementById('authModal');
    if (m) return m;
    m = document.createElement('div');
    m.id = 'authModal';
    m.className = 'hidden';
    m.setAttribute('aria-hidden', 'true');
    m.innerHTML = `
      <div class="auth-backdrop">
        <div class="auth-box">
          <div class="box-head">
            <div class="box-title">Đăng nhập / Đăng ký / Quên mật khẩu</div>
            <button class="btn" data-auth="close" style="margin-left:auto">Đóng</button>
          </div>

          <div class="tabs">
            <button type="button" data-auth-tab="login"  class="active">Đăng nhập</button>
            <button type="button" data-auth-tab="signup">Đăng ký</button>
            <button type="button" data-auth-tab="reset">Quên mật khẩu</button>
          </div>

          <div class="forms">
            <!-- LOGIN -->
            <form id="formLogin" class="active">
              <div class="form-row">
                <label>Email</label>
                <input type="email" name="email" autocomplete="username" required />
              </div>
              <div class="form-row">
                <label>Mật khẩu</label>
                <input type="password" name="password" autocomplete="current-password" required />
              </div>
              <div class="actions">
                <button type="submit" class="btn primary">Đăng nhập</button>
                <button type="button" class="btn google" data-auth="google">Đăng nhập Google</button>
              </div>
            </form>

            <!-- SIGNUP -->
            <form id="formSignup">
              <div class="form-row">
                <label>Email</label>
                <input type="email" name="email" autocomplete="email" required />
              </div>
              <div class="form-row">
                <label>Mật khẩu</label>
                <input type="password" name="password" autocomplete="new-password" required />
              </div>
              <div class="form-row">
                <label>Nhập lại mật khẩu</label>
                <input type="password" name="confirm" autocomplete="new-password" required />
              </div>
              <div class="actions">
                <button type="submit" class="btn primary">Đăng ký</button>
              </div>
              <div class="hint">Bạn sẽ nhận email xác minh (verification email).</div>
            </form>

            <!-- RESET -->
            <form id="formReset">
              <div class="form-row">
                <label>Email</label>
                <input type="email" name="email" autocomplete="email" required />
              </div>
              <div class="actions">
                <button type="submit" class="btn primary">Gửi link đặt lại</button>
              </div>
              <div class="hint">Chúng tôi sẽ gửi link đặt lại mật khẩu qua email.</div>
            </form>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(m);
    return m;
  }

  const M = () => document.getElementById('authModal') || ensureModal();

  // ---- Mở/Đóng
  function openModal() {
    const m = M();
    m.classList.remove('hidden');
    m.setAttribute('aria-hidden', 'false');
    // autofocus email ở tab hiện tại
    const f = m.querySelector('form.active input[type="email"]');
    if (f) setTimeout(() => f.focus(), 0);
  }
  function closeModal() {
    const m = M();
    m.classList.add('hidden');
    m.setAttribute('aria-hidden', 'true');
  }

  // ---- Chuyển tab
  function switchTab(name) {
    const m = M();
    m.querySelectorAll('.tabs [data-auth-tab]').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-auth-tab') === name);
    });
    m.querySelectorAll('.forms form').forEach(f => {
      f.classList.toggle('active', f.id === `form${name[0].toUpperCase()+name.slice(1)}`);
    });
    const f = m.querySelector('form.active input[type="email"]');
    if (f) f.focus();
  }

  // ---- Lắng nghe mở/đóng qua bus (nếu nơi khác emit)
  N.on && N.on('auth:open', openModal);
  N.on && N.on('auth:close', closeModal);

  // ---- Click chung: backdrop/close/tab/google
  document.addEventListener('click', (e) => {
    const m = document.getElementById('authModal');
    const insideModal = e.target.closest('#authModal');
    if (!insideModal) return; // click ngoài modal -> để event khác xử lý

    // backdrop
    const insideBox = e.target.closest('#authModal .auth-box');
    if (insideModal && !insideBox) {
      e.preventDefault();
      closeModal();
      N.emit && N.emit('auth:close');
      return;
    }

    // nút Đóng
    if (e.target.closest('[data-auth="close"]')) {
      e.preventDefault();
      closeModal();
      N.emit && N.emit('auth:close');
      return;
    }

    // tabs
    const tabBtn = e.target.closest('[data-auth-tab]');
    if (tabBtn) {
      e.preventDefault();
      switchTab(tabBtn.getAttribute('data-auth-tab'));
      return;
    }

    // Google
    if (e.target.closest('[data-auth="google"]')) {
      e.preventDefault();
      N.emit && N.emit('auth:google');
      // tuỳ bạn: chuyển hướng Google OAuth ở đây
      return;
    }
  });

  // ---- ESC để đóng
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const m = document.getElementById('authModal');
    if (!m || m.getAttribute('aria-hidden') === 'true') return;
    e.preventDefault();
    closeModal();
    N.emit && N.emit('auth:close');
  });

 // ---- SUBMIT bằng delegation (robust) ----
// ---- SUBMIT bằng delegation (robust) ----
document.addEventListener('submit', (e) => {
  const f = e.target;
  if (!f.matches('#formLogin, #formSignup, #formReset')) return;

  e.preventDefault();

  const fd = new FormData(f);
  const pick = (name, sel) => {
    const v1 = fd.get(name);
    if (v1 != null && String(v1).length) return String(v1);
    const el = f.querySelector(sel || `[name="${name}"], input[name="${name}"]`);
    return el ? String(el.value || '') : '';
  };

  // Chuẩn hoá input
  const email    = pick('email',    'input[type="email"]').trim().toLowerCase();
  const password = pick('password', 'input[type="password"]');

  const N = (window.NINI = window.NINI || {});

  if (f.id === 'formLogin') {
    N.emit && N.emit('auth:login',  { email, password });
    return;
  }

  if (f.id === 'formSignup') {
    const confirm = pick('confirm', 'input[name="confirm"]');
    N.emit && N.emit('auth:signup', { email, password, confirm });
    return;
  }

  if (f.id === 'formReset') {
    N.emit && N.emit('auth:reset',  { email });
    return;
  }
}); // <-- đóng KHỐI submit delegation

// (tùy chọn) Prefill từ query string khi test
(() => {
  const p = new URLSearchParams(location.search);
  const em = p.get('email'); const pw = p.get('password');
  if (!em && !pw) return;
  const login = document.getElementById('formLogin');
  if (!login) return;
  if (em) login.querySelector('input[name="email"]').value    = em;
  if (pw) login.querySelector('input[name="password"]').value = pw;
})();

// tạo modal ngay để CSS áp vào
ensureModal();
})(); // <-- NHỚ đóng IIFE của toàn file
