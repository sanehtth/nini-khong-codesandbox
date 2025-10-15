/* app-shell.js – Router + kiểm tra đăng nhập (singleton) */

(function () {
  if (window.__APP_SHELL_INIT) return;       // << khóa đa lần
  window.__APP_SHELL_INIT = true;

  const N = (window.NINI = window.NINI || {});
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  const state = {
    route: location.pathname.replace(/\/+$/,'') || '/home',
    user : null
  };

  // ==== helpers ====
  function initials(u){
    const n=(u?.displayName||u?.email||'').trim();
    const a=n.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    return ((a[0]||'N')[0]||'N') + ((a[a.length-1]||'')[0]||'');
  }

  function setActiveRail(){
    $$('.rail .ico').forEach(i=>{
      i.classList.toggle('active', state.route.startsWith(i.dataset.nav));
    });
  }

  // ==== AUTH OPEN: singleton ====
  function openAuth(){
  if (N.emit) N.emit('auth:open');      // chỉ yêu cầu mở modal
  // KHÔNG đụng đến #fabAuth ở đây
}

  function ensureSignedIn(ok){
    if (state.user) { ok && ok(); return; }
    openAuth();
  }

  // ==== VIEWS ====
  const L = $('#colLeft'), R = $('#colRight');

  const views = {
    '/home': ()=>{
      L.innerHTML = `<h2>Xin chào với NiNi — Funny</h2>
        <p>Dùng thanh bên trái để mở Storybook, Video, Game, Shop, Chat, Thông báo, Cài đặt.</p>`;
      R.innerHTML = `<h2>Mẹo</h2><p>Nhấp các icon ở rail trái hoặc thẻ trên thanh trên cùng.</p>`;
    },
    '/storybook': ()=>{
      L.innerHTML = `<h2>Thư viện</h2>
        <div class="list">
          <div class="item active">Bé NiNi & khu rừng</div>
          <div class="item">Cuộc đua sắc màu</div>
          <div class="item">Bạn mới của NiNi</div>
        </div>`;
      R.innerHTML = `<h2>Bạn mới của NiNi</h2>
        <p>Khung đọc thử nội dung sẽ hiển thị ở đây.</p>
        <button class="btn">Đọc từ đầu</button>
        <button class="btn">Tiếp tục</button>`;
    },
    '/video': ()=>{
      L.innerHTML = `<h2>Video</h2>
        <div class="list">
          <div class="item active">Chuỗi 1 — mẹo tư duy nhanh</div>
          <div class="item">Chuỗi 2 — giải đố</div>
          <div class="item">Chuỗi 3 — kể chuyện</div>
        </div>`;
      R.innerHTML = `<h2>Phát video</h2><p>Khung player ở đây.</p>`;
    },
    '/game': ()=>{
      L.innerHTML = `<h2>Game</h2>
        <div class="list">
          <div class="item active">Ghép hình</div>
          <div class="item">Tìm điểm khác</div>
          <div class="item">Mê cung</div>
        </div>`;
      R.innerHTML = `<h2>Chọn game để bắt đầu</h2>`;
    },
    '/shop': ()=>{
      L.innerHTML = `<h2>Shop</h2>
        <div class="list">
          <div class="item active">Sticker NiNi</div>
          <div class="item">Sổ tay giải đố</div>
          <div class="item">Áo thun NiNi</div>
        </div>`;
      R.innerHTML = `<h2>Sản phẩm nổi bật</h2><p>Chi tiết sẽ hiển thị ở đây.</p>`;
    },
    '/chat': ()=>{
      ensureSignedIn(()=>{
        L.innerHTML = `<h2>Bạn bè</h2>
          <div class="list">
            <div class="item active">Meo Chan</div>
            <div class="item">Cú Mực</div>
            <div class="item">Thỏ Trắng</div>
          </div>`;
        R.innerHTML = `<h2>Chat với Meo Chan</h2>
          <div style="height:340px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:12px;margin-bottom:12px"></div>
          <div style="display:flex;gap:8px">
            <input class="panel" style="flex:1;padding:10px" placeholder="Nhập tin nhắn...">
            <button class="btn">Gửi</button>
          </div>`;
      });
    },
    '/notify': ()=>{
      ensureSignedIn(()=>{
        L.innerHTML = `<h2>Thông báo</h2>
          <div class="list">
            <div class="item active">Nhiệm vụ ngày (3)</div>
            <div class="item">Cập nhật phiên bản</div>
            <div class="item">Khuyến mãi Shop</div>
          </div>`;
        R.innerHTML = `<h2>Nhiệm vụ ngày</h2>
          <ul><li>Đọc 1 chương truyện</li><li>Chơi 1 game</li><li>Mời 1 bạn mới</li></ul>`;
      });
    },
    '/settings': ()=>{
      ensureSignedIn(()=>{
        L.innerHTML = `<h2>Cài đặt</h2>
          <div class="list">
            <div class="item active">Hồ sơ</div>
            <div class="item">Bảo mật</div>
            <div class="item">Thông báo</div>
          </div>`;
        R.innerHTML = `<h2>Tùy chỉnh</h2><p>Để trống – bạn sẽ thiết lập sau.</p>`;
      });
    },
    '/profile': ()=>{
      ensureSignedIn(()=>{
        const u = state.user;
        L.innerHTML = `<h2>Hồ sơ</h2>
          <div class="list">
            <div class="item active">Thông tin cá nhân</div>
            <div class="item">Thành tích</div>
          </div>`;
        R.innerHTML = `<h2>Xin chào, ${u.displayName || u.email || ''}</h2>
          <p>XP: 1,250 • Xu: 430</p>
          <p>Vật phẩm: Rương gỗ ×2 • Rương bạc ×1</p>`;
      });
    }
  };

  function render(){
    (views[state.route] || views['/home'])();
    setActiveRail();
  }

  function goto(path){
    if (path === state.route) return;
    state.route = path;
    history.pushState({},'',path);
    render();
  }

  // ==== EVENTS (gắn 1 lần duy nhất) ====
  document.addEventListener('click', (e)=>{
    const nav = e.target.closest('[data-nav]');
    if (nav){ e.preventDefault(); goto(nav.dataset.nav); return; }

    // avatar dropdown
    if (e.target.id === 'userAvatar'){
      $('#userDrop').classList.toggle('open');
    } else if (!e.target.closest('#userDrop')){
      $('#userDrop')?.classList.remove('open');
    }

    // mở auth
    if (e.target.closest('[data-auth="open"]')){ e.preventDefault(); openAuth(); }

    // logout
    if (e.target.closest('#btnLogout')){
      e.preventDefault();
      try{ (N.fb || (N.fb = (window.NINI && window.NINI.fb) || {})).logout(); }
      catch(err){ console.error(err); }
    }
  });

  // ==== AUTH STATE SYNC ====
  function applyUser(u){
    state.user = u || null;
    const btnLogin = $('#btnAuthOpen');
    const av = $('#userAvatar');

    if (u){
      btnLogin.style.display = 'none';
      av.style.display = 'grid';
      if (u.photoURL){
        av.style.background='transparent';
        av.innerHTML = `<img src="${u.photoURL}" referrerpolicy="no-referrer"
                        style="width:30px;height:30px;border-radius:50%">`;
      } else {
        av.textContent = initials(u);
      }
      $('#fabAuth').style.display = 'none';
    } else {
      btnLogin.style.display = '';
      av.style.display = 'none';
      $('#fabAuth').style.display = 'inline-block'; // có 1 cái duy nhất
    }
  }

  try{
    // nhận user change từ glue
    (N.fb || (N.fb = (window.NINI && window.NINI.fb) || {})).onUserChanged((u)=>{
      applyUser(u);
      // nếu đang ở trang cần login mà bị sign-out
      if (!u && ['/profile','/chat','/notify','/settings'].includes(state.route)){
        R.innerHTML = `<h2>Hồ sơ</h2>
          <p>Bạn chưa đăng nhập. Nhấn <button class="btn" data-auth="open">Đăng nhập</button> để tiếp tục.</p>`;
      } else {
        render();
      }
    });
  }catch(_){}

  window.addEventListener('popstate', ()=>{
    state.route = location.pathname.replace(/\/+$/,'') || '/home';
    render();
  });

  // init
  state.route = location.pathname.replace(/\/+$/,'') || '/home';
  render();
})();

