// /public/js/nini-header.js  (type="module")
// YÊU CẦU: /public/js/nini-fb.js đã được load trước (type="module")

/* ==========
   RENDER HEADER
   ========== */
const HEADER_CSS = `
.nini-header { position:relative; display:flex; align-items:center; gap:16px;
  padding:10px 14px; border-radius:14px; background:rgba(255,255,255,.08);
  border:1px solid rgba(255,255,255,.18); backdrop-filter:blur(8px);
}
.nini-brand { display:flex; align-items:center; gap:10px; font-weight:700; }
.nini-brand img { height:22px; width:auto; display:block; }
.nini-tabs { display:flex; gap:8px; margin-left:8px; }
.nini-tabs button { padding:6px 12px; border-radius:18px; border:1px solid rgba(255,255,255,.22);
  background:rgba(255,255,255,.1); color:#fff; cursor:pointer; }
.nini-tabs button.active { background:rgba(255,255,255,.22); }
.nini-user { margin-left:auto; display:flex; align-items:center; gap:8px; }
.nini-user .avatar { width:28px; height:28px; border-radius:50%; object-fit:cover; }
.nini-user .btn { padding:6px 10px; border-radius:18px; border:1px solid rgba(255,255,255,.22);
  background:rgba(255,255,255,.1); color:#fff; cursor:pointer; }

/* modal */
.nini-mask { position:fixed; inset:0; display:none; align-items:center; justify-content:center;
  background:rgba(0,0,0,.4); z-index:9999; }
.nini-mask.show { display:flex; }
.nini-modal { width:min(520px, 92vw); border-radius:14px; border:1px solid rgba(255,255,255,.22);
  background:rgba(255,255,255,.08); backdrop-filter:blur(8px); padding:16px; color:#fff;
}
.nini-modal .tabs { display:flex; gap:8px; margin-bottom:12px; }
.nini-modal .tabs button { padding:6px 10px; border-radius:14px; border:1px solid rgba(255,255,255,.22);
  background:rgba(255,255,255,.1); color:#fff; cursor:pointer; }
.nini-modal .tabs button.active { background:rgba(255,255,255,.22); }
.nini-modal .row { display:flex; gap:8px; margin:10px 0; }
.nini-modal input { flex:1; padding:10px 12px; border-radius:10px; border:1px solid rgba(255,255,255,.22);
  background:rgba(255,255,255,.1); color:#fff; }
.nini-modal .actions { display:flex; gap:8px; justify-content:flex-end; margin-top:12px; }
.nini-modal .actions button { padding:8px 12px; border-radius:10px; border:1px solid rgba(255,255,255,.22);
  background:rgba(255,255,255,.1); color:#fff; cursor:pointer; }
`;

function injectCss() {
  if (document.getElementById('nini-header-css')) return;
  const s = document.createElement('style');
  s.id = 'nini-header-css';
  s.textContent = HEADER_CSS;
  document.head.appendChild(s);
}

function html(strings, ...vals) {
  return strings.reduce((o, s, i) => o + s + (vals[i] ?? ''), '');
}

/* ==========
   MODAL LOGIN / REGISTER / FORGOT
   ========== */
function buildAuthModal() {
  const wrap = document.createElement('div');
  wrap.className = 'nini-mask';
  wrap.innerHTML = html`
    <div class="nini-modal">
      <div class="tabs">
        <button id="tabLogin"   class="active">Đăng nhập</button>
        <button id="tabSignup">Đăng ký</button>
        <button id="tabForgot">Quên mật khẩu</button>
      </div>

      <div id="paneLogin">
        <div class="row"><input id="loginEmail" type="email" placeholder="you@example.com"></div>
        <div class="row"><input id="loginPass"  type="password" placeholder="Mật khẩu"></div>
        <div class="actions">
          <button id="btnLoginGoogle">Đăng nhập với Google</button>
          <button id="btnLogin">Đăng nhập</button>
          <button id="btnClose1">Đóng</button>
        </div>
      </div>

      <div id="paneSignup" style="display:none">
        <div class="row"><input id="signupName"  type="text" placeholder="Tên hiển thị (tuỳ chọn)"></div>
        <div class="row"><input id="signupEmail" type="email" placeholder="you@example.com"></div>
        <div class="row"><input id="signupPass"  type="password" placeholder="Mật khẩu (>=6 ký tự)"></div>
        <div class="actions">
          <button id="btnSignup">Đăng ký</button>
          <button id="btnClose2">Đóng</button>
        </div>
      </div>

      <div id="paneForgot" style="display:none">
        <div class="row"><input id="forgotEmail" type="email" placeholder="Email đã đăng ký"></div>
        <div class="actions">
          <button id="btnSendReset">Gửi link đặt lại</button>
          <button id="btnClose3">Đóng</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(wrap);

  // tab switching
  const tabLogin  = wrap.querySelector('#tabLogin');
  const tabSignup = wrap.querySelector('#tabSignup');
  const tabForgot = wrap.querySelector('#tabForgot');
  const paneLogin  = wrap.querySelector('#paneLogin');
  const paneSignup = wrap.querySelector('#paneSignup');
  const paneForgot = wrap.querySelector('#paneForgot');
  function show(tab) {
    [tabLogin,tabSignup,tabForgot].forEach(b=>b.classList.remove('active'));
    paneLogin.style.display = paneSignup.style.display = paneForgot.style.display = 'none';
    if (tab==='login')   { tabLogin.classList.add('active');  paneLogin.style.display='block'; }
    if (tab==='signup')  { tabSignup.classList.add('active'); paneSignup.style.display='block'; }
    if (tab==='forgot')  { tabForgot.classList.add('active'); paneForgot.style.display='block'; }
  }
  tabLogin.onclick  = () => show('login');
  tabSignup.onclick = () => show('signup');
  tabForgot.onclick = () => show('forgot');

  // close buttons
  wrap.querySelector('#btnClose1').onclick =
  wrap.querySelector('#btnClose2').onclick =
  wrap.querySelector('#btnClose3').onclick = () => wrap.classList.remove('show');

  // actions
  wrap.querySelector('#btnLoginGoogle').onclick = async () => {
    try {
      await NINI.fb.loginGoogle();
      wrap.classList.remove('show');
      alert('Đăng nhập thành công!');
    } catch (e) { alert('Lỗi: ' + (e?.message || e)); }
  };

  wrap.querySelector('#btnLogin').onclick = async () => {
    const email = wrap.querySelector('#loginEmail').value.trim();
    const pass  = wrap.querySelector('#loginPass').value;
    if (!email || !pass) { alert('Nhập email và mật khẩu.'); return; }
    try {
      await NINI.fb.loginEmailPass(email, pass);
      wrap.classList.remove('show');
    } catch (e) { alert('Không đăng nhập được: ' + (e?.message || e)); }
  };

  wrap.querySelector('#btnSignup').onclick = async () => {
    const name  = wrap.querySelector('#signupName').value.trim();
    const email = wrap.querySelector('#signupEmail').value.trim();
    const pass  = wrap.querySelector('#signupPass').value;
    if (!email || !pass) { alert('Nhập email và mật khẩu.'); return; }
    try {
      await NINI.fb.registerEmailPass(email, pass, name);
      wrap.classList.remove('show');
      alert('Đăng ký thành công. Bạn đã đăng nhập!');
    } catch (e) { alert('Không đăng ký được: ' + (e?.message || e)); }
  };

  wrap.querySelector('#btnSendReset').onclick = async () => {
    const email = wrap.querySelector('#forgotEmail').value.trim();
    if (!email) { alert('Nhập email đã đăng ký.'); return; }
    try {
      await NINI.fb.resetPassword(email);
      alert('Đã gửi link đặt lại mật khẩu tới: ' + email);
    } catch (e) { alert('Không gửi được email: ' + (e?.message || e)); }
  };

  return {
    open(tab='login'){ show(tab); wrap.classList.add('show'); },
    close(){ wrap.classList.remove('show'); },
  };
}

/* ==========
   MOUNT HEADER
   ========== */
function mountHeader(containerSel, opts = {}) {
  injectCss();
  const el = document.querySelector(containerSel) || document.body;
  const header = document.createElement('div');
  header.className = 'nini-header';
  header.innerHTML = html`
    <div class="nini-brand">
      <img src="/public/assets/icons/logo_text.webp" alt="NiNi">
      <span>Chơi mê ly, bứt phá tư duy</span>
    </div>

    <nav class="nini-tabs" id="niniTabs">
      <button data-s="home">Home</button>
      <button data-s="spring">Spring</button>
      <button data-s="summer">Summer</button>
      <button data-s="autumn">Autumn</button>
      <button data-s="winter">Winter</button>
    </nav>

    <div class="nini-user" id="niniUser">
      <img class="avatar" src="/public/assets/avatar/NINI.webp" alt="">
      <button class="btn" id="btnAuthOpen">Đăng nhập / Đăng ký</button>
    </div>
  `;
  el.prepend(header);

  // season navigation
  const tabs = header.querySelector('#niniTabs');
  tabs.addEventListener('click', (ev) => {
    const b = ev.target.closest('button'); if (!b) return;
    const s = b.dataset.s;
    const map = {home:'#/home', spring:'#/spring', summer:'#/summer', autumn:'#/autumn', winter:'#/winter'};
    const href = map[s] || '#/home';
    window.location.hash = href.substring(1);
  });

  // modal
  const modal = buildAuthModal();
  header.querySelector('#btnAuthOpen').onclick = () => modal.open('login');

  // user slot update
  const userBox = header.querySelector('#niniUser');
  function renderUser(u){
    if (!u) {
      userBox.innerHTML = `
        <img class="avatar" src="/public/assets/avatar/NINI.webp" alt="">
        <button class="btn" id="btnAuthOpen">Đăng nhập / Đăng ký</button>
      `;
      userBox.querySelector('#btnAuthOpen').onclick = () => modal.open('login');
      return;
    }
    const email = u.email || '';
    const photo = u.photoURL || '/public/assets/avatar/NINI.webp';
    userBox.innerHTML = `
      <img class="avatar" src="${photo}" alt="avatar">
      <span>${email}</span>
      <button class="btn" id="btnLogout">Đăng xuất</button>
    `;
    userBox.querySelector('#btnLogout').onclick = async () => {
      try { await NINI.fb.logout(); } catch(e){ alert('Không đăng xuất được: '+(e?.message||e)); }
    };
  }

  // subscribe auth change
  NINI.fb.onUserChanged(renderUser);
}

/* ==========
   EXPORT API (để trang gọi)
   ========== */
window.NINI = window.NINI || {};
window.NINI.header = { mount: mountHeader };
