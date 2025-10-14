/* app-shell.js — router + render + kiểm tra đăng nhập cho hồ sơ / chat / notify / settings
   YÊU CẦU: đã có /public/js/nini-fb.mjs và /test/js/auth-glue.js (đã nghe onUserChanged)
*/
(function () {
  const N = (window.NINI = window.NINI || {});
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$= (sel, root=document) => Array.from(root.querySelectorAll(sel));

  // ---------- STATE ----------
  const state = {
    route: location.pathname.replace(/\/+$/, '') || '/home',
    user: null
  };

  // helper
  function initialsOf(u){
    const name = (u?.displayName || u?.email || '').trim();
    const a = name.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    return ((a[0]||'')[0]||'N' + (a[a.length-1]||'')[0]||'');
  }
  function setActiveRail(){
    $$('.rail .ico').forEach(i=>{
      const nav = i.getAttribute('data-nav');
      i.classList.toggle('active', state.route.startsWith(nav));
    });
  }
  function openAuth(){ N.emit && N.emit('auth:open'); }

  // gọi khi cần bảo vệ trang
  function ensureSignedIn(onOk){
    if (state.user) return onOk && onOk();
    // Lần đầu: mở modal
    openAuth();
    // Dự phòng: hiện nút fab
    $('#fabAuth').style.display = 'inline-block';
  }

  // ---------- RENDER ----------
  const L = $('#colLeft'), R = $('#colRight');

  const views = {
    '/home': () => {
      L.innerHTML = `<h2>Xin chào với NiNi — Funny</h2>
        <p>Dùng thanh bên trái để mở <strong>Storybook</strong>, <strong>Video</strong>, <strong>Game</strong>, <strong>Shop</strong>, <strong>Chat</strong>, <strong>Thông báo</strong>, <strong>Cài đặt</strong>.</p>`;
      R.innerHTML = `<h2>Mẹo</h2><p>Nhấp các icon ở rail trái hoặc các thẻ trên thanh trên cùng.</p>`;
    },

    '/storybook': () => {
      L.innerHTML = `<h2>Thư viện</h2>
        <div class="list" id="sbList">
          <div class="item" data-id="b1">Bé NiNi & khu rừng</div>
          <div class="item" data-id="b2">Cuộc đua sắc màu</div>
          <div class="item" data-id="b3">Bạn mới của NiNi</div>
        </div>`;
      R.innerHTML = `<h2>Bạn mới của NiNi</h2>
        <p>Khung đọc thử nội dung sẽ hiển thị ở đây.</p>
        <button class="btn">Đọc từ đầu</button> <button class="btn">Tiếp tục</button>`;
    },

    '/video': () => {
      L.innerHTML = `<h2>Video</h2>
        <div class="list">
          <div class="item">Chuỗi 1 — mẹo tư duy nhanh</div>
          <div class="item">Chuỗi 2 — giải đố cùng NiNi</div>
          <div class="item">Chuỗi 3 — kể chuyện tương tác</div>
        </div>`;
      R.innerHTML = `<h2>Phát video</h2><p>Khung player ở đây.</p>`;
    },

    '/game': () => {
      L.innerHTML = `<h2>Game</h2>
        <div class="list">
          <div class="item">Ghép hình</div>
          <div class="item">Tìm điểm khác</div>
          <div class="item">Mê cung</div>
        </div>`;
      R.innerHTML = `<h2>Chọn game để bắt đầu</h2>`;
    },

    '/shop': () => {
      L.innerHTML = `<h2>Shop</h2>
        <div class="list">
          <div class="item">Sticker NiNi</div>
          <div class="item">Sổ tay giải đố</div>
          <div class="item">Áo thun NiNi</div>
        </div>`;
      R.innerHTML = `<h2>Sản phẩm nổi bật</h2><p>Chi tiết sản phẩm sẽ hiển thị ở đây.</p>`;
    },

    // ====== 3 mục mới ======
    '/chat': () => {
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
            <input id="msg" class="panel" style="flex:1;padding:10px" placeholder="Nhập tin nhắn...">
            <button class="btn">Gửi</button>
          </div>`;
      });
    },

    '/notify': () => {
      ensureSignedIn(()=>{
        L.innerHTML = `<h2>Thông báo</h2>
          <div class="list">
            <div class="item active">Nhiệm vụ ngày (3)</div>
            <div class="item">Cập nhật phiên bản</div>
            <div class="item">Khuyến mãi Shop</div>
          </div>`;
        R.innerHTML = `<h2>Nhiệm vụ ngày</h2><ul>
          <li>Đọc 1 chương truyện</li>
          <li>Chơi 1 game</li>
          <li>Mời 1 bạn mới</li></ul>`;
      });
    },

    '/settings': () => {
      ensureSignedIn(()=>{
        L.innerHTML = `<h2>Cài đặt</h2>
          <div class="list">
            <div class="item active">Hồ sơ</div>
            <div class="item">Bảo mật</div>
            <div class="item">Thông báo</div>
          </div>`;
        R.innerHTML = `<h2>Tùy chỉnh</h2><p>Khu vực để trống, bạn sẽ set sau.</p>`;
      });
    },

    '/profile': () => {
      ensureSignedIn(()=>{
        L.innerHTML = `<h2>Hồ sơ</h2>
          <div class="list">
            <div class="item active">Thông tin cá nhân</div>
            <div class="item">Thành tích</div>
          </div>`;
        const u = state.user;
        R.innerHTML = `<h2>Xin chào, ${u.displayName || u.email || ''}</h2>
          <p>XP: 1,250 • Xu: 430</p>
          <p>Vật phẩm: Rương gỗ × 2 • Rương bạc × 1</p>`;
      });
    }
  };

  function render(){
    const fn = views[state.route] || views['/home'];
    fn();
    setActiveRail();
  }

  // ---------- NAV ----------
  function goto(path){
    if (path === state.route) return;
    state.route = path;
    history.pushState({}, '', path);
    render();
  }
  // Click trên top tabs & rail
  document.addEventListener('click', (e)=>{
    const nav = e.target.closest('[data-nav]');
    if (nav){ e.preventDefault(); goto(nav.dataset.nav); return; }

    // avatar dropdown
    if (e.target.id === 'userAvatar'){
      $('#userDrop').classList.toggle('open');
    } else if (!e.target.closest('#userDrop')){
      $('#userDrop')?.classList.remove('open');
    }

    // mở auth modal
    if (e.target.closest('[data-auth="open"]')){
      e.preventDefault(); openAuth();
    }
  });

  // ---------- AUTH STATE ----------
  // cập nhật header theo user
  function applyUser(u){
    state.user = u || null;
    const btnLogin = $('#btnAuthOpen');
    const av = $('#userAvatar');
    const dd = $('#userDrop');
    // toggle
    if (u){
      btnLogin.style.display = 'none';
      av.style.display = 'grid';
      av.textContent = u.photoURL ? '' : (initialsOf(u));
      if (u.photoURL){ av.style.background='transparent'; av.innerHTML=`<img src="${u.photoURL}" style="width:30px;height:30px;border-radius:50%" referrerpolicy="no-referrer">`; }
      $('#fabAuth').style.display = 'none';
      dd?.classList.remove('open');
    } else {
      btnLogin.style.display = '';
      av.style.display = 'none';
      $('#fabAuth').style.display = 'inline-block';
    }
  }

  // nhận tín hiệu từ fb glue
  try{
    const fb = (window.NINI && window.NINI.fb) || {};
    fb.onUserChanged && fb.onUserChanged((u)=>{
      applyUser(u);
      // nếu đang ở trang cần login mà user sign-out => render lại
      if (!u && ['/profile','/chat','/notify','/settings'].includes(state.route)){
        R.innerHTML = `<h2>Hồ sơ</h2><p>Bạn chưa đăng nhập. Nhấn <button class="btn" data-auth="open">Đăng nhập</button> để tiếp tục.</p>`;
      } else {
        render();
      }
    });
  }catch(_){}

  // logout
  document.addEventListener('click', async (e)=>{
    const btn = e.target.closest('#btnLogout');
    if (!btn) return;
    e.preventDefault();
    try{
      const fb = (window.NINI && window.NINI.fb) || {};
      await fb.logout();
    }catch(err){ console.error(err); }
  });

  // popstate
  window.addEventListener('popstate', ()=>{
    state.route = location.pathname.replace(/\/+$/, '') || '/home';
    render();
  });

  // khởi tạo
  state.route = location.pathname.replace(/\/+$/, '') || '/home';
  render();
})();
