// /test/js/auth-modal.js
// NiNi Auth Modal (render + hành vi). Dựa trên window.N.fb (đã có alias).

(function(){
  const MODAL_ID = 'authModal';
  const BACKDROP_ID = 'authBackdrop';
  const SVERI = '/.netlify/functions/send-verification-email';
  const SRESET = '/.netlify/functions/send-reset';

  if (window.NiNiAuth) return;

  const qs = (sel, el=document)=>el.querySelector(sel);
  const isEmail = s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s||'').trim());

  function openModal(tab='login'){
    const back = qs('#'+BACKDROP_ID);
    const host = qs('#'+MODAL_ID);
    if (!back || !host) return;
    document.body.classList.add('body-auth-open');
    back.hidden = false; host.hidden = false; host.classList.add('open');
    host.innerHTML = renderHTML(tab);
    bindBehavior(host);
  }
  function closeModal(){
    const back = qs('#'+BACKDROP_ID);
    const host = qs('#'+MODAL_ID);
    if (!back || !host) return;
    document.body.classList.remove('body-auth-open');
    back.hidden = true; host.hidden = true; host.classList.remove('open');
    host.innerHTML = '';
  }

  function renderHTML(active='login'){
    const is = k => k===active ? 'active' : '';
    return `
      <div class="auth-panel glass" role="dialog" aria-modal="true">
        <div class="auth-head">
          <h3 class="auth-title">Tài khoản NiNi</h3>
          <button class="auth-close" data-x>&times;</button>
        </div>

        <div class="auth-tabs" role="tablist">
          <button class="auth-tab ${is('login')}"  data-tab="login">Đăng nhập</button>
          <button class="auth-tab ${is('signup')}" data-tab="signup">Đăng ký</button>
          <button class="auth-tab ${is('forgot')}" data-tab="forgot">Quên mật khẩu</button>
        </div>

        <div class="auth-body" data-view="${active}">
          ${active==='login' ? viewLogin() : active==='signup' ? viewSignup() : viewForgot()}
        </div>
      </div>`;
  }

  const viewLogin = () => `
    <div class="auth-row"><label>Email</label>
      <input class="auth-input" type="email" id="auth_email" placeholder="you@email.com">
    </div>
    <div class="auth-row"><label>Mật khẩu</label>
      <input class="auth-input" type="password" id="auth_pass" placeholder="••••••••">
    </div>
    <div class="auth-actions">
      <button class="auth-btn" data-login>Đăng nhập</button>
      <button class="auth-btn ghost" data-google>Đăng nhập Google</button>
      <span class="auth-msg" id="auth_msg"></span>
    </div>`;

  const viewSignup = () => `
    <div class="auth-row"><label>Email</label>
      <input class="auth-input" type="email" id="auth_email" placeholder="you@email.com">
    </div>
    <div class="auth-actions">
      <button class="auth-btn" data-signup>Gửi email xác minh</button>
      <span class="auth-msg" id="auth_msg"></span>
    </div>
    <div class="auth-msg">* Sau khi xác minh, bạn sẽ được hướng sang trang đặt mật khẩu.</div>`;

  const viewForgot = () => `
    <div class="auth-row"><label>Email</label>
      <input class="auth-input" type="email" id="auth_email" placeholder="you@email.com">
    </div>
    <div class="auth-actions">
      <button class="auth-btn" data-forgot>Gửi email đặt lại mật khẩu</button>
      <span class="auth-msg" id="auth_msg"></span>
    </div>`;

  function bindBehavior(root){
    const setTab = (tab) => { root.innerHTML = renderHTML(tab); bindBehavior(root); };

    root.addEventListener('click', async (ev)=>{
      const t = ev.target;
      if (t.matches('[data-x]')) { closeModal(); return; }
      if (t.matches('.auth-tab')) { setTab(t.dataset.tab); return; }

      const vEmail = () => qs('#auth_email', root)?.value.trim().toLowerCase();
      const vPass  = () => qs('#auth_pass', root)?.value;
      const msgEl  = qs('#auth_msg', root);
      const say = (m, ok=false)=>{ if(msgEl){ msgEl.textContent = m; msgEl.style.color = ok?'#065f46':'#7f1d1d'; } };

      try{
        // Đăng nhập email/pass
        if (t.matches('[data-login]')) {
          const email = vEmail(); const pass = vPass();
          if (!isEmail(email) || !pass) { say('Email/mật khẩu chưa hợp lệ'); return; }
          say('Đang đăng nhập...');
          const user = await window.N?.fb?.signInEmailPass?.(email, pass);
          say('Đăng nhập thành công!', true);
          document.dispatchEvent(new CustomEvent('NiNi:user-changed', { detail: user || null }));
          setTimeout(closeModal, 250);
          return;
        }
        // Đăng nhập Google
        if (t.matches('[data-google]')) {
          say('Đang mở Google...');
          const user = await window.N?.fb?.signInGoogle?.();
          say('Đăng nhập Google thành công!', true);
          document.dispatchEvent(new CustomEvent('NiNi:user-changed', { detail: user || null }));
          setTimeout(closeModal, 250);
          return;
        }
        // Đăng ký email-only (gửi mail xác minh)
        if (t.matches('[data-signup]')) {
          const email = vEmail(); if (!isEmail(email)) { say('Email không hợp lệ'); return; }
          say('Đang gửi thư xác minh...');
          const r = await fetch(SVERI, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, createIfMissing:true })});
          const js = await r.json().catch(()=>({}));
          if (!js || js.ok === false) { throw new Error(js?.error || 'SEND_FAILED'); }
          say('Đã gửi email xác minh. Vui lòng kiểm tra hộp thư.', true);
          return;
        }
        // Quên mật khẩu
        if (t.matches('[data-forgot]')) {
          const email = vEmail(); if (!isEmail(email)) { say('Email không hợp lệ'); return; }
          say('Đang gửi liên kết đặt lại...');
          const r = await fetch(SRESET, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email })});
          const js = await r.json().catch(()=>({}));
          if (!js || js.ok === false) { throw new Error(js?.error || 'SEND_FAILED'); }
          say('Đã gửi email đặt lại mật khẩu. Vui lòng kiểm tra hộp thư.', true);
          return;
        }
      }catch(err){
        console.error(err);
        say(`Lỗi: ${err.message || err}`);
      }
    });
  }

  window.NiNiAuth = { open: openModal, close: closeModal };
  document.getElementById(BACKDROP_ID)?.addEventListener('click', closeModal);
})();
