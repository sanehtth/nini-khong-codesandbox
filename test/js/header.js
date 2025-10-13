/* ======================================================================
   header.js — Safe render + cleanup legacy + toggle theo user
   ----------------------------------------------------------------------
   - Render đúng MỘT header vào #nini_header
   - Cleanup: xoá tất cả control auth/legacy nằm ngoài #nini_header
   - Toggle UI theo user (guest/auth)
   - Avatar: dùng photoURL nếu có, không thì hiển thị chữ cái
   - Nút avatar -> /profile.html ; Nút Đăng nhập -> mở modal ; Đăng xuất -> N.fb.signOut()
   ====================================================================== */
(function () {
  const N = (window.NINI = window.NINI || {});
  if (N._wiredHeader) return;         // chặn render 2 lần
  N._wiredHeader = true;

  const $ = (s, r = document) => r.querySelector(s);

  function ready(fn){
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  function render(){
    const root = document.getElementById('nini_header');
    if (!root) { console.warn('[header] Không tìm thấy #nini_header'); return; }

    root.innerHTML = `
      <div class="nini-header-wrap">
        <div class="brand">
          <a class="logo" href="/#/home" title="NiNi — Funny"></a>
          <span class="slogan">chơi mê ly, bứt phá tư duy</span>
        </div>

        <nav class="nav">
          <a class="nav-link" href="/#/home">Trang chủ</a>
          <a class="nav-link" href="/#/rules">Luật chơi</a>
        </nav>

        <div class="userbox" id="userbox">
          <!-- trạng thái khi CHƯA đăng nhập -->
          <button id="btnAuthOpen" class="btn-auth guest-only" type="button">Đăng nhập / Đăng ký</button>

          <!-- trạng thái khi ĐÃ đăng nhập -->
          <div id="userInfo" class="user-info auth-only">
            <button id="btnProfile" class="avatar" type="button" title="Hồ sơ" data-letter="U"></button>
            <span class="nick" id="userNick">NiNi</span>
            <button id="btnSignOut" class="btn-auth" type="button">Đăng xuất</button>
          </div>
        </div>
      </div>
    `;

    /* === CLEANUP LEGACY (mở rộng selector) ============================ */
    document.querySelectorAll([
      // mới
      '.btn-auth','.avatar','.user-info',
      // cũ có thể còn
      '.btn-login','.btn-logout','#btnLogout','.logout','.login',
      '.user','.userbox','.user-menu','.auth-controls','.auth-box'
    ].join(',')).forEach(el => {
      if (!el.closest('#nini_header')) el.remove();
    });

    // Trường hợp “U/N” bị render dạng text node rời rạc (rất ít khi)
    Array.from(document.body.children).forEach(el => {
      if (el.id === 'nini_header') return;
      if (el.children.length === 0 && /^[UN]$/.test(el.textContent.trim())) el.remove();
    });

    /* === Bind events ================================================== */
    // mở modal
    $('#btnAuthOpen')?.addEventListener('click', () => {
      if (N.emit) N.emit('auth:open');
      const m = document.getElementById('authModal');
      if (m){
        m.classList.remove('hidden');
        m.setAttribute('aria-hidden','false');
        document.body.classList.add('body-auth-open');
      }
    });

    // avatar -> trang hồ sơ
    $('#btnProfile')?.addEventListener('click', () => {
      location.href = '/profile.html';
    });

    // đăng xuất
    $('#btnSignOut')?.addEventListener('click', async () => {
      try { await N.fb?.signOut?.(); } catch(e){ console.error(e); }
    });
  }

  function updateAuthUI(user){
    const btnAuth = document.getElementById('btnAuthOpen');
    const boxUser = document.getElementById('userInfo');
    const nick    = document.getElementById('userNick');
    const avaBtn  = document.getElementById('btnProfile');

    if (user){
      document.body.setAttribute('data-auth','in');
      if (btnAuth) btnAuth.style.display = 'none';
      if (boxUser) boxUser.style.display = 'inline-flex';

      const display = user.displayName || (user.email ? user.email.split('@')[0] : '') || 'NiNi';
      if (nick) nick.textContent = display;

      const letter = (display.trim()[0] || 'U').toUpperCase();
      if (avaBtn){
        // photoURL -> dùng ảnh, không thì nền màu + chữ cái
        if (user.photoURL){
          avaBtn.style.setProperty('--ava-bg', `url("${user.photoURL}")`);
        }else{
          avaBtn.style.removeProperty('--ava-bg');
        }
        avaBtn.setAttribute('data-letter', letter);
      }
    }else{
      document.body.setAttribute('data-auth','out');
      if (boxUser) boxUser.style.display = 'none';
      if (btnAuth) btnAuth.style.display = 'inline-flex';
      if (avaBtn){
        avaBtn.style.removeProperty('--ava-bg');
        avaBtn.setAttribute('data-letter','U');
      }
    }
  }

  /* ===== Wire ======================================================== */
  ready(() => {
    render();

    // subscribe trạng thái user
    if (N.fb?.onUserChanged) N.fb.onUserChanged(updateAuthUI);

    // cập nhật ngay nếu đã có user
    try{
      if (N.fb?.currentUser){
        updateAuthUI(N.fb.currentUser());   // có thể trả user hoặc null
      }else{
        updateAuthUI(null);
      }
    }catch(e){ updateAuthUI(null); }
  });
})();
