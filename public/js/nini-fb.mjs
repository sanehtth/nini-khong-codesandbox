/* public/js/nini-fb.mjs */
// ---- Firebase init (ví dụ - giữ nguyên config của bạn) ----
let app, auth;
function ensureFirebase() {
  if (auth) return auth;
  // Ở đây giữ lại import của bạn (hoặc SDK v9 compat), ví dụ:
  // import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
  // import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
  // app = initializeApp(firebaseConfig);
  // auth = getAuth(app);
  // return auth;
  return null; // nếu bạn đang dùng file khác để khởi tạo thì để nguyên; chỉ cần đảm bảo auth có giá trị
}

// ---- Helpers (mock hoặc gọi thật tới Firebase auth của bạn) ----
async function getCurrentUser() {
  // nếu dùng Firebase thật:
  // const a = ensureFirebase();
  // return a.currentUser;
  return null;
}
async function logout() {
  // const a = ensureFirebase();
  // await signOut(a);
}
async function signInEmail(email, pass) {
  // const a = ensureFirebase();
  // return await signInWithEmailAndPassword(a, email, pass);
  return { user: { email } };
}
async function signUpEmail(email, pass) {
  // const a = ensureFirebase();
  // return await createUserWithEmailAndPassword(a, email, pass);
  return { user: { email } };
}
async function resetPass(email) {
  // const a = ensureFirebase();
  // await sendPasswordResetEmail(a, email);
}

// ---- Modal UI ----
function injectStylesOnce() {
  if (document.getElementById('nini-auth-css')) return;
  const css = `
  .nini-auth-mask{position:fixed;inset:0;background:rgba(0,0,0,.25);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;z-index:9999}
  .nini-auth{width:min(92vw,420px);background:rgba(255,255,255,.85);border:1px solid rgba(255,255,255,.4);border-radius:18px;box-shadow:0 10px 30px rgba(0,0,0,.15);overflow:hidden}
  .nini-auth header{display:flex;gap:8px;padding:10px;border-bottom:1px solid rgba(0,0,0,.05)}
  .nini-auth header button{flex:1;border-radius:999px;padding:8px 10px;border:1px solid rgba(0,0,0,.08);background:#fff;cursor:pointer}
  .nini-auth .body{padding:14px 16px 18px}
  .nini-auth .row{display:flex;flex-direction:column;gap:6px;margin:8px 0}
  .nini-auth input{border:1px solid rgba(0,0,0,.12);border-radius:10px;padding:10px}
  .nini-auth .actions{display:flex;gap:8px;justify-content:flex-end;margin-top:10px}
  .nini-auth .link{font-size:13px;color:#0b57d0;cursor:pointer}
  .nini-auth .close{position:absolute;right:8px;top:8px;border:none;background:transparent;font-size:18px;cursor:pointer}
  `;
  const el = document.createElement('style');
  el.id = 'nini-auth-css';
  el.textContent = css;
  document.head.appendChild(el);
}

function renderLogin(type, box) {
  let title = 'Đăng nhập';
  if (type === 'signup') title = 'Đăng ký';
  if (type === 'reset')  title = 'Quên mật khẩu';

  box.innerHTML = `
    <button class="close" aria-label="Đóng">✕</button>
    <header>
      <button data-tab="login" ${type==='login'?'style="font-weight:700"':''}>Đăng nhập</button>
      <button data-tab="signup" ${type==='signup'?'style="font-weight:700"':''}>Đăng ký</button>
      <button data-tab="reset" ${type==='reset'?'style="font-weight:700"':''}>Quên mật khẩu</button>
    </header>
    <div class="body">
      <div class="row"><strong>${title}</strong></div>
      ${ type!=='reset' ? `
      <div class="row">
        <label>Email</label>
        <input id="authEmail" type="email" placeholder="you@example.com">
      </div>
      <div class="row">
        <label>Mật khẩu</label>
        <input id="authPass" type="password" placeholder="••••••••">
      </div>
      <div class="actions">
        <button id="btnCancel">Hủy</button>
        <button id="btnSubmit">${type==='signup'?'Tạo tài khoản':'Đăng nhập'}</button>
      </div>
      <div class="row"><span class="link" id="goReset">Quên mật khẩu?</span></div>
      ` : `
      <div class="row">
        <label>Email</label>
        <input id="authEmail" type="email" placeholder="you@example.com">
      </div>
      <div class="actions">
        <button id="btnCancel">Hủy</button>
        <button id="btnSubmit">Gửi link khôi phục</button>
      </div>
      ` }
    </div>
  `;

  // tab switching
  box.querySelectorAll('header [data-tab]').forEach(b=>{
    b.onclick = () => renderLogin(b.dataset.tab, box);
  });

  box.querySelector('.close').onclick =
  box.querySelector('#btnCancel').onclick = () => box.parentElement.remove();

  const submit = box.querySelector('#btnSubmit');
  submit.onclick = async () => {
    const email = box.querySelector('#authEmail')?.value?.trim();
    const pass  = box.querySelector('#authPass')?.value;
    try {
      if (type === 'signup') {
        await signUpEmail(email, pass);
      } else if (type === 'login') {
        await signInEmail(email, pass);
      } else {
        await resetPass(email);
      }
      box.parentElement.remove();
      // cập nhật header sau khi đăng nhập
      window.NINI?.__applyUser && window.NINI.__applyUser();
    } catch (e) {
      alert(e?.message || 'Có lỗi xảy ra');
    }
  };

  const goReset = box.querySelector('#goReset');
  if (goReset) goReset.onclick = () => renderLogin('reset', box);
}

function loginModal() {
  injectStylesOnce();
  // nếu đã login thì thôi
  getCurrentUser().then(u=>{
    if (u) return; // đã đăng nhập
  });

  const mask = document.createElement('div');
  mask.className = 'nini-auth-mask';
  mask.innerHTML = `<div class="nini-auth"></div>`;
  document.body.appendChild(mask);
  const box = mask.querySelector('.nini-auth');
  renderLogin('login', box);
}

// ---- API Public ----
export const fb = { loginModal, getCurrentUser, logout };

// ---- Gắn lên window cho script thường (header) gọi được ----
if (typeof window !== 'undefined') {
  window.NINI = window.NINI || {};
  window.NINI.fb = fb;
}
