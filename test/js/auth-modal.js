/* /test/js/auth-modal.js
   Popup đăng nhập – tabs: login / register / forgot
   API mở/đóng:  NiNiAuth.open(tab?), NiNiAuth.close()
   Sự kiện phát ra:
     - window.dispatchEvent(new CustomEvent('NiNi:auth-changed',{detail:user||null}))
*/

(function(){
  const ID_BACKDROP = 'authBackdrop';
  const ID_MODAL    = 'authModal';
  if (window.NiNiAuth) return; // tránh khởi tạo trùng

  // ===== helpers =====
  const $ = (sel, root=document) => root.querySelector(sel);
  function el(html){
    const t = document.createElement('template');
    t.innerHTML = html.trim(); return t.content.firstChild;
  }
  function setMsg(box, text, ok){
    if (!box) return;
    box.textContent = text;
    box.classList.remove('ok','err','show');
    if (text) { box.classList.add('show'); box.classList.add(ok?'ok':'err'); }
  }

  // ===== mount DOM một lần =====
  function ensureDock(){
    if (!document.getElementById(ID_BACKDROP))
      document.body.appendChild(el(`<div id="${ID_BACKDROP}" hidden></div>`));
    if (!document.getElementById(ID_MODAL))
      document.body.appendChild(el(`<div id="${ID_MODAL}" hidden></div>`));
  }

  function renderPanel(tab='login'){
    const host = document.getElementById(ID_MODAL);
    host.innerHTML = `
      <div class="auth-panel">
        <div class="auth-hd">
          <div class="auth-title">Tài khoản NiNi</div>
          <button class="auth-close" aria-label="Đóng">✕</button>
        </div>

        <div class="auth-tabs" role="tablist" aria-label="Chọn thao tác">
          <button class="auth-tab" data-k="login">Đăng nhập</button>
          <button class="auth-tab" data-k="register">Đăng ký</button>
          <button class="auth-tab" data-k="forgot">Quên mật khẩu</button>
        </div>

        <div class="auth-body"></div>
      </div>
    `;

    // events
    $('.auth-close', host).onclick = API.close;
    host.addEventListener('click', (e)=>{
      const t = e.target.closest('.auth-tab'); if (!t) return;
      showTab(t.dataset.k);
    });

    function showTab(k){
      [...host.querySelectorAll('.auth-tab')]
        .forEach(b=>b.classList.toggle('active', b.dataset.k===k));
      const body = $('.auth-body', host);
      if (k==='login') body.innerHTML = viewLogin();
      if (k==='register') body.innerHTML = viewRegister();
      if (k==='forgot') body.innerHTML = viewForgot();
      wireTab(k);
    }

    function viewLogin(){
      return `
        <div class="auth-form" data-tab="login">
          <div id="loginMsg" class="auth-msg"></div>
          <input id="loginEmail" class="auth-input" type="email" placeholder="Email" autocomplete="email">
          <input id="loginPass" class="auth-input" type="password" placeholder="Mật khẩu" autocomplete="current-password">
          <button id="btnLogin" class="auth-btn">Đăng nhập</button>
          <button id="btnLoginGG" class="auth-btn google">
            <img src="/public/assets/icons/google.svg" alt="" width="18" height="18">
            Đăng nhập bằng Google
          </button>
          <div class="auth-note">Ghi chú: nếu nút báo lỗi “Chưa nối Firebase”, hãy kiểm tra <code>nini-fb.mjs</code>.</div>
        </div>
      `;
    }
    function viewRegister(){
      return `
        <div class="auth-form" data-tab="register">
          <div id="regMsg" class="auth-msg"></div>
          <input id="regEmail" class="auth-input" type="email" placeholder="Email" autocomplete="email">
          <button id="btnReg" class="auth-btn">Gửi email xác nhận</button>
          <div class="auth-note">Ghi chú: kiểm tra hộp thư để xác nhận. Nếu không thấy, hãy kiểm tra thư mục Spam/Quảng cáo.</div>
        </div>
      `;
    }
    function viewForgot(){
      return `
        <div class="auth-form" data-tab="forgot">
          <div id="fogMsg" class="auth-msg"></div>
          <input id="fogEmail" class="auth-input" type="email" placeholder="Email" autocomplete="email">
          <button id="btnFog" class="auth-btn">Gửi email đặt lại mật khẩu</button>
          <div class="auth-note">Ghi chú: mở email để đặt lại mật khẩu. Nếu không nhận được, vui lòng thử lại sau vài phút.</div>
        </div>
      `;
    }

    function wireTab(k){
      const NFB = window.N?.fb || {}; // wrapper từ nini-fb.mjs (nếu có)
      if (k==='login'){
        const msg = $('#loginMsg', host);
        $('#btnLogin', host).onclick = async()=>{
          const email = $('#loginEmail', host).value.trim();
          const pass  = $('#loginPass', host).value;
          if (!email || !pass){ setMsg(msg,'Vui lòng nhập email và mật khẩu!', false); return; }

          try{
            if (typeof NFB.signInEmailPass === 'function'){
              const user = await NFB.signInEmailPass(email, pass);
              setMsg(msg,'Đăng nhập thành công!', true);
              window.dispatchEvent(new CustomEvent('NiNi:auth-changed',{detail:user||{email}}));
              setTimeout(API.close, 500);
            }else{
              setMsg(msg,'Chưa nối Firebase (thiếu N.fb.signInEmailPass)', false);
            }
          }catch(err){
            setMsg(msg, 'Không đăng nhập được: '+ (err?.message || err), false);
          }
        };
        $('#btnLoginGG', host).onclick = async()=>{
          const msg = $('#loginMsg', host);
          try{
            if (typeof NFB.signInGoogle === 'function'){
              const user = await NFB.signInGoogle();
              setMsg(msg,'Đăng nhập Google thành công!', true);
              window.dispatchEvent(new CustomEvent('NiNi:auth-changed',{detail:user||{provider:'google'}}));
              setTimeout(API.close, 500);
            }else{
              setMsg(msg,'Chưa nối Firebase (thiếu N.fb.signInGoogle)', false);
            }
          }catch(err){
            setMsg(msg,'Không đăng nhập được (Google): '+(err?.message||err), false);
          }
        };
      }
      if (k==='register'){
        const msg = $('#regMsg', host);
        $('#btnReg', host).onclick = async()=>{
          const email = $('#regEmail', host).value.trim();
          if (!email){ setMsg(msg,'Vui lòng nhập email!', false); return; }
          try{
            // Tuỳ cách bạn implement: sendSignInLinkToEmail() hoặc createUser + sendEmailVerification()
            if (typeof NFB.sendSignInEmail === 'function'){
              await NFB.sendSignInEmail(email);
              setMsg(msg,'Đã gửi email xác nhận. Vui lòng vào email để hoàn tất đăng ký.', true);
            }else if (typeof NFB.registerEmailOnly === 'function'){
              await NFB.registerEmailOnly(email);
              setMsg(msg,'Đã gửi email xác nhận. Vui lòng kiểm tra hộp thư.', true);
            }else{
              setMsg(msg,'Chưa nối Firebase (cần N.fb.sendSignInEmail hoặc N.fb.registerEmailOnly).', false);
            }
          }catch(err){
            setMsg(msg,'Không gửi được email xác nhận: '+(err?.message||err), false);
          }
        };
      }
      if (k==='forgot'){
        const msg = $('#fogMsg', host);
        $('#btnFog', host).onclick = async()=>{
          const email = $('#fogEmail', host).value.trim();
          if (!email){ setMsg(msg,'Vui lòng nhập email!', false); return; }
          try{
            if (typeof NFB.sendReset === 'function'){
              await NFB.sendReset(email);
              setMsg(msg,'Đã gửi email đặt lại mật khẩu. Vui lòng vào email để tiếp tục.', true);
            }else{
              setMsg(msg,'Chưa nối Firebase (thiếu N.fb.sendReset).', false);
            }
          }catch(err){
            setMsg(msg,'Không gửi được email đặt lại: '+(err?.message||err), false);
          }
        };
      }
    }

    showTab(tab);
  }

  // ===== Public API =====
  const API = {
    open(tab='login'){
      ensureDock();
      renderPanel(tab);
      document.getElementById(ID_BACKDROP).hidden = false;
      document.getElementById(ID_MODAL).hidden    = false;
      document.body.classList.add('body-auth-open');
    },
    close(){
      const bd = document.getElementById(ID_BACKDROP);
      const md = document.getElementById(ID_MODAL);
      if (bd) bd.hidden = true;
      if (md) md.hidden = true;
      document.body.classList.remove('body-auth-open');
    }
  };
  window.NiNiAuth = API;

  // Cho FAB/Sidebar có thể mở nếu gọi event chung
  document.addEventListener('nini:open-login', ()=>API.open('login'));
})();
