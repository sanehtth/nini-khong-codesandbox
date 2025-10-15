<!-- Nhớ nhúng file này sau khi đã load NINI core + auth-glue.js -->
/* ---------------------------------------------------------
   auth-modal.js
   - Bắt tab (Đăng nhập / Đăng ký / Quên mật khẩu)
   - Bắt submit form và phát sự kiện cho auth-glue.js
   - Điều khiển mở/đóng modal + trạng thái loading nhẹ
   --------------------------------------------------------- */
(function () {
  const N = (window.NINI = window.NINI || {});
  if (N._wiredAuthModal) return;   // tránh double-bind
  N._wiredAuthModal = true;

  // Mini event-bus (nếu chưa có)
  if (!N.emit) {
    const _evts = {};
    N.on  = (name, fn) => ((_evts[name] = _evts[name] || []).push(fn), fn);
    N.emit= (name, payload) => (_evts[name]||[]).forEach(fn => { try{ fn(payload||{}); }catch(_){ } });
  }

 // ==== helpers an toàn ====
   
const $  = (s, r = document) => r?.querySelector?.(s) || null;
const $$ = (s, r = document) => (r?.querySelectorAll ? Array.from(r.querySelectorAll(s)) : []);

// Đảm bảo DOM cho auth modal/backdrop tồn tại trước khi dùng
function ensureAuthShell() {
  let modal = $('#authModal');
  if (!modal) {
    // Nếu dự án của bạn đã inject modal ở file khác, bạn có thể return null để đợi lần sau
    // return null;

    // Còn nếu muốn tạo skeleton tối thiểu (để không crash) thì bật đoạn sau:
    modal = document.createElement('div');
    modal.id = 'authModal';
    modal.setAttribute('hidden', '');         // ẩn mặc định
    modal.innerHTML = `
      <div class="auth-box">
        <div class="auth-head">
          <button class="tab" data-tab="login">Đăng nhập</button>
          <button class="tab" data-tab="signup">Đăng ký</button>
          <button class="tab" data-tab="reset">Quên mật khẩu</button>
          <button id="btnAuthClose" aria-label="Đóng">×</button>
        </div>
        <div class="msg" aria-live="polite"></div>
        <form id="formLogin"  data-pane="login"></form>
        <form id="formSignup" data-pane="signup" hidden></form>
        <form id="formReset"  data-pane="reset"  hidden></form>
        <button id="btnGoogle" type="button">Google</button>
      </div>`;
    document.body.appendChild(modal);
  }

  let backdrop = $('#authBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'authBackdrop';
    backdrop.setAttribute('hidden', '');
    document.body.appendChild(backdrop);
  }
  return modal;
}

// ==== lấy các node với guard null an toàn ====
const modal  = ensureAuthShell();
if (!modal) {
  console.warn('[auth-modal] Shell chưa sẵn sàng, bỏ qua init lần này.');
  // tránh crash: thoát sớm; lần sau khi shell có thì init lại
  return;
}
const box    = $('.auth-box', modal);
const msgBox = $('.msg', box);
const tabs   = $$('.auth-head .tab', box);

// các form/nút có thể chưa có — dùng guard cho chắc
const frmLogin   = $('#formLogin',  box);
const frmSignup  = $('#formSignup', box);
const frmReset   = $('#formReset',  box);
const btnOpenFab = $('#btnAuthOpenFab');   // nếu có
const btnClose   = $('#btnAuthClose', box) || $('#btnAuthClose');
const btnGoogle  = $('#btnGoogle', box);


  // -------- Helpers UI ----------
  function openModal() {
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('body-auth-open');
    clearMsg();
  }
  function closeModal() {
    if (!modal) return;
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('body-auth-open');
  }
  function setActivePane(name) {
    $$('.pane', box).forEach(p => p.classList.remove('active'));
    if (name === 'login')  frmLogin?.classList.add('active');
    if (name === 'signup') frmSignup?.classList.add('active');
    if (name === 'reset')  frmReset?.classList.add('active');
    tabs.forEach(t => t.classList.toggle('is-active', t.dataset.authTab === name));
    clearMsg();
  }
  function setLoading(form, isOn, text) {
    if (!form) return;
    const submit = form.querySelector('button[type="submit"]');
    if (!submit) return;
    if (isOn) {
      submit.dataset._text = submit.textContent;
      if (text) submit.textContent = text;
      submit.disabled = true;
    } else {
      submit.textContent = submit.dataset._text || submit.textContent;
      submit.disabled = false;
    }
  }
  function showMsg(type, text) {
    if (!msgBox) return;
    msgBox.className = 'msg' + (type ? ' ' + type : '');
    msgBox.textContent = text || '';
  }
  function clearMsg(){ showMsg('', ''); }

  // --------- Wire: mở/đóng ----------
  btnOpenFab?.addEventListener('click', (e) => { e.preventDefault(); openModal(); });
  btnClose?.addEventListener('click',  (e) => { e.preventDefault(); closeModal(); });
  // click nền ngoài để đóng
  modal?.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  // --------- Wire: tabs ----------
  tabs.forEach(tab => {
    tab.addEventListener('click', () => setActivePane(tab.dataset.authTab));
  });

  // --------- Wire: submit forms ----------
  frmLogin?.addEventListener('submit', (e) => {
    e.preventDefault();
    clearMsg();
    const email = (frmLogin.querySelector('input[name="email"]')?.value || '').trim();
    const password = (frmLogin.querySelector('input[name="password"]')?.value || '').trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showMsg('err','Email không hợp lệ.'); return;
    }
    if (!password) { showMsg('err','Vui lòng nhập mật khẩu.'); return; }
    setLoading(frmLogin, true, 'Đang đăng nhập...');
    N.emit('auth:login', { email, password });
  });

  frmSignup?.addEventListener('submit', (e) => {
    e.preventDefault();
    clearMsg();
    const email = (frmSignup.querySelector('input[name="email"]')?.value || '').trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showMsg('err','Email không hợp lệ.'); return;
    }
    setLoading(frmSignup, true, 'Đang gửi email xác minh...');
    N.emit('auth:signup', { email });
  });

  frmReset?.addEventListener('submit', (e) => {
    e.preventDefault();
    clearMsg();
    const email = (frmReset.querySelector('input[name="email"]')?.value || '').trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showMsg('err','Email không hợp lệ.'); return;
    }
    setLoading(frmReset, true, 'Đang gửi link...');
    N.emit('auth:reset', { email });
  });

  // Google
  btnGoogle?.addEventListener('click', (e) => {
    e.preventDefault();
    clearMsg();
    showMsg('', 'Đang mở Google...');
    N.emit('auth:google', {});
  });

  // --------- Nhận phản hồi từ auth-glue ----------
  // auth-glue sẽ gọi setMsg() nội bộ của nó, nhưng mình lắng nghe thêm
  // để đồng bộ loading & đóng modal sau khi OK
  N.on && N.on('auth:ui:done', ({ form, ok, message }) => {
    // form: 'login' | 'signup' | 'reset'
    const map = { login: frmLogin, signup: frmSignup, reset: frmReset };
    setLoading(map[form], false);
    if (message) showMsg(ok ? 'ok' : 'err', message);
    if (ok && form !== 'reset') closeModal(); // login/signup OK → đóng
  });

  // Khi auth-glue muốn chỉ hiển thị thông điệp
  N.on && N.on('auth:ui:msg', ({ type, text }) => showMsg(type, text));
})();

