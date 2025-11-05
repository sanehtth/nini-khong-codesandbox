/* ========================================================================
   NiNi — stage.js
   Layout 3 cột + Router hash + 6 mục mới (Video, Game, Shop, Chat, Thông báo, Hồ sơ)
   - Cột trái: sidebar icon (luôn cố định)
   - Cột giữa & Cột phải: thay đổi theo route
   - Auth-gate: các route yêu cầu đăng nhập sẽ hiển thị CTA "Đăng nhập"
   ------------------------------------------------------------------------
   ROUTES hỗ trợ:
   #/home         (Storybook)
   #/Gioithieu    #/Luatchoi  #/Diendan  #/Lienhe
   #/Video        #/Game      #/Shop     #/Chat   #/ThongBao  #/Profile
   ======================================================================== */

/* --------------------------- [0] Demo data (mock) ----------------------- */
// Dữ liệu demo: bạn thay bằng data thật khi có API / Firestore
const DEMO_VIDEOS = [
  {
    id: 'v1',
    title: 'AI có mơ chăng?',
    url: 'https://www.youtube.com/embed/StFihkKIywo?si=7QSX371UAAXk-seX'  // ✅
  },
  {
    id: 'v2',
    title: 'Tua video 2',
    url: 'https://www.youtube.com/embed/ohq5S9YRHA0'
  }
];


const DEMO_GAMES = [
  { id: 'g1', name: 'Puzzle Forest', url: '/game/puzzle.html' },
  { id: 'g2', name: 'Word Quest',    url: '/game/word.html'   },
];

const DEMO_SHOP = [
  { id: 's1', name: 'Sticker NiNi (bộ 20)', price: '49.000đ', desc: 'Sticker vinyl chống nước.', img: '/public/assets/images/stickers.webp' },
  { id: 's2', name: 'Sổ tay giải đố',        price: '89.000đ', desc: '100 thử thách tư duy.',     img: '/public/assets/images/notebook.webp' },
];

const DEMO_FRIENDS = [
  { id: 'u1', name: 'Lan' }, { id: 'u2', name: 'Minh' }, { id: 'u3', name: 'Bảo' },
];

const DEMO_NOTIFS = [
  { id: 'n1', date: '2025-10-01', title: 'Hệ thống', content: 'Cập nhật Storybook v2.' },
  { id: 'n2', date: '2025-10-12', title: 'Sự kiện',  content: 'Mini game tuần này đã mở.' },
];

/* --------------------------- [1] Auth helpers --------------------------- */

// Lấy user từ cache bridge (NiNi.user), fallback Firebase wrapper
function getCurrentUser() {
  // ưu tiên cache do core.js bridge
  const cached = window.NiNi?.user;
  if (cached) return cached;

  // fallback sang wrapper fb
  const fb = window.NiNi?.fb || window.NINI?.fb;
  if (!fb) return null;
  try {
    return (typeof fb.currentUser === 'function')
      ? fb.currentUser()
      : (fb.currentUser || null);
  } catch { return null; }
}

function openLoginModal() {
  if (window.NiNiAuth && typeof NiNiAuth.open === 'function') {
    NiNiAuth.open('login');
    return;
  }
  document.dispatchEvent(new CustomEvent('nini:open-login'));
}

function gatePanel(title, desc = 'Bạn cần đăng nhập để sử dụng tính năng này.') {
  return `
    <div class="panel glass">
      <h2 style="margin:0 0 10px">${title}</h2>
      <p class="muted" style="margin:0 0 12px">${desc}</p>
      <button class="btn" id="gate_login_btn">Đăng nhập</button>
    </div>
  `;
}
function mountGateButton() {
  const btn = document.getElementById('gate_login_btn');
  if (btn) btn.onclick = openLoginModal;
}

/* --------------------------- [2] Khung 3 cột ---------------------------- */
function renderStage(root) {
  root.innerHTML = `
    <div class="nini-layout">
      <!-- Cột trái: Sidebar Icons -->
      <aside class="nini-side glass">
        <div class="side-icons">
          <a class="icon-btn" data-route="home" title="Storybook">
            <span class="icon"><img src="/public/assets/icons/book.webp"  alt="book" width="28" height="28" onerror="this.src='/public/assets/icons/book.png'"></span>
            <span class="lbl">Storybook</span>
          </a>
          <a class="icon-btn" data-route="Video" title="Video">
            <span class="icon"><img src="/public/assets/icons/video.webp" alt="video" width="28" height="28" onerror="this.src='/public/assets/icons/video.png'"></span>
            <span class="lbl">Video</span>
          </a>
          <a class="icon-btn" data-route="Game" title="Game">
            <span class="icon"><img src="/public/assets/icons/game.webp" alt="game" width="28" height="28" onerror="this.src='/public/assets/icons/game.png'"></span>
            <span class="lbl">Game</span>
          </a>
          <a class="icon-btn" data-route="Shop" title="Shop">
            <span class="icon"><img src="/public/assets/icons/shop.webp"    alt="shop" width="28" height="28" onerror="this.src='/public/assets/icons/shop.png'"></span>
            <span class="lbl">Shop</span>
          </a>
          <a class="icon-btn" data-route="Chat" title="Chat">
            <span class="icon"><img src="/public/assets/icons/chat.webp"    alt="chat" width="28" height="28" onerror="this.src='/public/assets/icons/chat.png'"></span>
            <span class="lbl">Chat</span>
          </a>
          <a class="icon-btn" data-route="ThongBao" title="Thông báo">
            <span class="icon"><img src="/public/assets/icons/note.webp"    alt="bell" width="28" height="28" onerror="this.src='/public/assets/icons/note.png'"></span>
            <span class="lbl">Thông báo</span>
          </a>
          <a class="icon-btn" data-route="Profile" title="Hồ sơ">
            <span class="icon"><img src="/public/assets/icons/user.webp"    alt="user" width="28" height="28" onerror="this.src='/public/assets/icons/user.png'"></span>
            <span class="lbl">Hồ sơ</span>
          </a>
        </div>
      </aside>

      <!-- Cột giữa -->
      <section id="col-mid" class="panel glass nini-middle"></section>

      <!-- Cột phải -->
      <section id="col-right" class="panel glass nini-main"></section>
    </div>
  `;

  // Delegation: click icon đổi route
  root.querySelector('.nini-side').addEventListener('click', (e) => {
    const a = e.target.closest('.icon-btn');
    if (!a) return;
    const key = a.dataset.route;
    location.hash = '/' + key;
  });
}

/* --------------------------- [3] HOME: Storybook ------------------------ */
function renderHomeMid() {
  const mid = document.getElementById('col-mid');
  mid.innerHTML = `
    <div class="storybook panel">
      <div class="sb-head">📚 Storybook</div>
      <div id="lib-list" class="lib-grid"></div>
    </div>
  `;
  // Dùng hàm có sẵn nếu có
  if (typeof loadLibraryTo === 'function') {
    loadLibraryTo('#lib-list');
  } else {
    // Fallback đơn giản (không lỗi)
    document.getElementById('lib-list').innerHTML = `
      <div class="lib-card"><div class="lib-cover"></div>
        <div><h4 class="lib-title">Chưa có loadLibraryTo()</h4><p class="lib-author">Vui lòng dùng hàm thật</p></div>
      </div>`;
  }
}
function renderHomeRight() {
  const right = document.getElementById('col-right');
  right.innerHTML = `
    <div class="story-reader">
      <header class="panel-head">
        <h2 id="reader_title">Chọn một cuốn sách</h2>
        <div class="reader-controls">
          <button class="btn small" data-lang="vi">VI</button>
          <button class="btn small" data-lang="en">EN</button>
          <button id="speak_btn" class="btn small" title="Đọc to">🔊</button>
        </div>
      </header>
      <div class="reader-stage">
        <figure class="reader-image"><img id="reader_img" alt=""></figure>
        <div class="reader-text" id="reader_text">…</div>
        <div class="reader-nav">
          <button id="prev_page" class="btn small">‹ Trang trước</button>
          <div class="page-indicator" id="reader_page">1/1</div>
          <button id="next_page" class="btn small">Trang sau ›</button>
        </div>
      </div>
    </div>
  `;
  if (typeof initReaderBehavior === 'function') {
    initReaderBehavior();
  }
}

/* --------------------------- [4] Intro/Rules/Forum/Contact ------------- */
function renderIntroMid()  { document.getElementById('col-mid').innerHTML   = `<div class="panel"><h3>Giới thiệu</h3><p class="muted">Tổng quan dự án, mục tiêu…</p></div>`; }
function renderIntroRight(){ document.getElementById('col-right').innerHTML = `<div class="panel prose"><h2>NiNi — Funny</h2><p>Kho sách nhỏ, game từ vựng, nhiệm vụ tư duy…</p></div>`; }

function renderRulesMid()  { document.getElementById('col-mid').innerHTML   = `<div class="panel"><h3>Luật chơi</h3><ul class="prose"><li>Đọc sách theo chương</li><li>Làm nhiệm vụ</li></ul></div>`; }
function renderRulesRight(){ document.getElementById('col-right').innerHTML = `<div class="panel prose"><h2>Mẹo</h2><p>Đọc to, ghi chú, làm quiz…</p></div>`; }

function renderForumMid()  { document.getElementById('col-mid').innerHTML   = `<div class="panel"><h3>Chủ đề mới</h3><div class="list"><div class="list__item"><span class="list__title">Góp ý UI</span><span class="list__meta">1h</span></div></div></div>`; }
function renderForumRight(){ document.getElementById('col-right').innerHTML = `<div class="panel prose"><h2>Thảo luận</h2><p>…</p></div>`; }

function renderContactMid(){ document.getElementById('col-mid').innerHTML   = `<div class="panel"><h3>Liên hệ</h3><p class="muted">Email, mạng xã hội…</p></div>`; }
function renderContactRight(){
  document.getElementById('col-right').innerHTML = `
    <div class="panel">
      <h2>Gửi lời nhắn</h2>
      <form class="form" onsubmit="event.preventDefault(); alert('Đã gửi!');">
        <input class="input" placeholder="Tên">
        <input class="input" placeholder="Email">
        <textarea class="input" rows="5" placeholder="Nội dung…"></textarea>
        <button class="btn">Gửi</button>
      </form>
    </div>`;
}

/* --------------------------- [5] ROUTES yêu cầu đăng nhập --------------- */
/* 5.1 Video */
// Chuẩn hoá link YouTube => /embed/{id}
function toEmbed(u){
  try{
    const url = new URL(u);
    if (url.hostname === 'youtu.be') return `https://www.youtube.com/embed/${url.pathname.slice(1)}`;
    if (url.hostname.includes('youtube')){
      if (url.pathname.startsWith('/embed/')) return u;
      const id = url.searchParams.get('v'); if (id) return `https://www.youtube.com/embed/${id}`;
    }
  }catch(e){}
  return u;
}
function ytThumb(u){
  const em = toEmbed(u);
  const id = em.split('/embed/')[1]?.split(/[?&#]/)[0] || '';
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : '';
}

// State
let VIDEO_DATA = { playlists: [] };
let CUR_PL = null;

// Tải JSON 1 lần
async function loadVideoData(){
  if (VIDEO_DATA.playlists.length) return;
  const res = await fetch('/public/content/video/videos.json', { cache: 'no-cache' });
  VIDEO_DATA = await res.json();
  CUR_PL = VIDEO_DATA.playlists[0]?.id || null;
}

// UI
async function renderVideoLeft(){
  await loadVideoData();

  const pls = VIDEO_DATA.playlists;
  const cur = CUR_PL || pls[0]?.id;
  const curPl = pls.find(p => p.id === cur) || { title: '', items: [] };

  document.getElementById('col-mid').innerHTML = `
    <div class="panel" id="video_panel">

      <!-- BLOCK 1: PLAYLIST -->
      <div class="pane">
        <h4 class="pane-title">Playlist</h4>
        <div id="pl_tabs" class="tabs tabs--wrap">
          ${pls.map((p, i) => `
            <button class="tab ${p.id === cur ? 'tab--active' : ''}" data-pl="${p.id}">
              ${p.title}
            </button>
            ${i === 0 ? '<span class="u-break"></span>' : ''}  <!-- xuống dòng giữa AI & NiNi -->
          `).join('')}
        </div>
      </div>

      <!-- BLOCK 2: DANH SÁCH VIDEO -->
      <div class="pane">
        <h4 class="pane-title">Danh sách Video</h4>
        <div class="lib-grid" id="video_list">
          ${curPl.items.map(v => `
            <article class="lib-card list__item" data-id="${v.id}">
              <div class="lib-cover">
                <img src="${ytThumb(v.url)}" alt="${v.title}">
              </div>
              <div>
                <h4 class="lib-title">${v.title}</h4>
                <p class="lib-author">${curPl.title}</p>
              </div>
            </article>
          `).join('')}
        </div>
      </div>

    </div>
  `;

  // đổi playlist
  document.getElementById('pl_tabs').onclick = (e) => {
    const b = e.target.closest('.tab'); if (!b) return;
    CUR_PL = b.dataset.pl;
    renderVideoLeft();                    // render lại list theo playlist mới
  };

  // click video -> phát bên phải
  document.getElementById('video_list').onclick = (e) => {
    const row = e.target.closest('.list__item'); if (!row) return;
    const v = curPl.items.find(x => x.id === row.dataset.id);
    playVideoRight(v);
  };
}

function renderVideoRight(){
  document.getElementById('col-right').innerHTML = `
    <div class="panel2">
      <h2 id="vid_ttl">Chọn video để xem</h2>
      <div style="aspect-ratio:16/9;background:#000;border-radius:14px;overflow:hidden">
        <iframe id="vid_frame" src="" width="100%" height="100%" frameborder="0"
                allow="autoplay; encrypted-media" allowfullscreen></iframe>
      </div>
    </div>
  `;
}

function playVideoRight(v){
  const f = document.getElementById('vid_frame');
  const t = document.getElementById('vid_ttl');
  if (f && v){ f.src = toEmbed(v.url); t.textContent = v.title; }
}

/* 5.2 Game */
function renderGameMid(){
  const u = getCurrentUser();
  if (!u) { document.getElementById('col-mid').innerHTML = gatePanel('Game'); mountGateButton(); return; }
  document.getElementById('col-mid').innerHTML = `
    <div class="panel"><h3>Danh sách Game</h3>
      <div class="list" id="game_list">
        ${DEMO_GAMES.map(g=>`
          <div class="list__item" data-id="${g.id}">
            <span class="list__title">${g.name}</span>
            <button class="btn btn--sm play">Play</button>
          </div>`).join('')}
      </div>
    </div>`;
  document.getElementById('game_list').onclick = (e)=>{
    const row = e.target.closest('.list__item'); if(!row) return;
    const game = DEMO_GAMES.find(x=>x.id===row.dataset.id);
    renderGameRight(game);
  };
}
function renderGameRight(game){
  const u = getCurrentUser();
  if (!u) { document.getElementById('col-right').innerHTML = gatePanel('Chơi game'); mountGateButton(); return; }
  document.getElementById('col-right').innerHTML = `
    <div class="panel">
      <h2>${game ? game.name : 'Chọn game'}</h2>
      ${game ? `<a class="btn" href="${game.url}" target="_blank" rel="noopener">Mở trong tab mới</a>` : '<p class="muted">Hãy chọn một game bên trái.</p>'}
    </div>`;
}

/* 5.3 Shop */
function renderShopMid(){
  const u = getCurrentUser();
  if (!u) { document.getElementById('col-mid').innerHTML = gatePanel('Shop'); mountGateButton(); return; }
  document.getElementById('col-mid').innerHTML = `
    <div class="panel"><h3>Sản phẩm</h3>
      <div class="list" id="shop_list">
        ${DEMO_SHOP.map(it=>`
          <div class="list__item" data-id="${it.id}">
            <span class="list__title">${it.name}</span>
            <span class="badge">${it.price}</span>
          </div>`).join('')}
      </div>
    </div>`;
  document.getElementById('shop_list').onclick = (e)=>{
    const row = e.target.closest('.list__item'); if(!row) return;
    const item = DEMO_SHOP.find(x=>x.id===row.dataset.id);
    renderShopRight(item);
  };
}
function renderShopRight(item){
  const u = getCurrentUser();
  if (!u) { document.getElementById('col-right').innerHTML = gatePanel('Chi tiết sản phẩm'); mountGateButton(); return; }
  if(!item){
    document.getElementById('col-right').innerHTML = `<div class="panel"><h2>Chi tiết</h2><p class="muted">Chọn một sản phẩm bên trái.</p></div>`;
    return;
  }
  document.getElementById('col-right').innerHTML = `
    <div class="panel">
      <h2>${item.name}</h2>
      <div style="display:grid;grid-template-columns:160px 1fr;gap:12px;align-items:start">
        <div style="width:160px;height:160px;border-radius:14px;overflow:hidden;background:#f1f5f9">
          <img src="${item.img}" alt="${item.name}" style="width:100%;height:100%;object-fit:cover">
        </div>
        <div>
          <p class="muted">${item.desc}</p>
          <div class="badge" style="font-weight:800">${item.price}</div>
          <div style="margin-top:12px"><button class="btn">Thêm vào giỏ</button></div>
        </div>
      </div>
    </div>`;
}

/* 5.4 Chat */
function renderChatMid(){
  const u = getCurrentUser();
  if (!u) { document.getElementById('col-mid').innerHTML = gatePanel('Bạn bè'); mountGateButton(); return; }
  document.getElementById('col-mid').innerHTML = `
    <div class="panel"><h3>Bạn bè</h3>
      <div class="list" id="friend_list">
        ${DEMO_FRIENDS.map(f=>`
          <div class="list__item" data-id="${f.id}">
            <span class="list__title">${f.name}</span>
            <span class="list__meta">online</span>
          </div>`).join('')}
      </div>
    </div>`;
  document.getElementById('friend_list').onclick = (e)=>{
    const row = e.target.closest('.list__item'); if(!row) return;
    const fr = DEMO_FRIENDS.find(x=>x.id===row.dataset.id);
    renderChatRight(fr);
  };
}
function renderChatRight(fr){
  const u = getCurrentUser();
  if (!u) { document.getElementById('col-right').innerHTML = gatePanel('Chat'); mountGateButton(); return; }
  document.getElementById('col-right').innerHTML = `
    <div class="panel">
      <h2>${fr ? 'Chat với ' + fr.name : 'Chọn bạn để chat'}</h2>
      <div id="chat_box" class="empty" style="min-height:220px;text-align:left">Không có tin nhắn…</div>
      <form id="chat_form" class="form" style="margin-top:10px">
        <input id="chat_input" class="input" placeholder="Nhập tin nhắn…">
        <button class="btn btn--sm" style="width:max-content">Gửi</button>
      </form>
    </div>`;
  document.getElementById('chat_form').onsubmit = (e)=>{
    e.preventDefault();
    const inp = document.getElementById('chat_input');
    const box = document.getElementById('chat_box');
    if(!inp.value.trim()) return;
    box.innerHTML += `<p><b>Tôi:</b> ${inp.value}</p>`;
    inp.value = '';
  };
}

/* 5.5 Thông báo */
function renderNotifMid(){
  const u = getCurrentUser();
  if (!u) { document.getElementById('col-mid').innerHTML = gatePanel('Thông báo'); mountGateButton(); return; }
  document.getElementById('col-mid').innerHTML = `
    <div class="panel"><h3>Danh sách</h3>
      <div class="list" id="notif_list">
        ${DEMO_NOTIFS.map(n=>`
          <div class="list__item" data-id="${n.id}">
            <span class="list__title">${n.title}</span>
            <span class="list__meta">${n.date}</span>
          </div>`).join('')}
      </div>
    </div>`;
  document.getElementById('notif_list').onclick = (e)=>{
    const row = e.target.closest('.list__item'); if(!row) return;
    const nf = DEMO_NOTIFS.find(x=>x.id===row.dataset.id);
    renderNotifRight(nf);
  };
}
function renderNotifRight(nf){
  const u = getCurrentUser();
  if (!u) { document.getElementById('col-right').innerHTML = gatePanel('Xem thông báo'); mountGateButton(); return; }
  document.getElementById('col-right').innerHTML = `
    <div class="panel"><h2>${nf ? nf.title : 'Chi tiết thông báo'}</h2>
      <p class="muted">${nf ? nf.date : ''}</p>
      <p>${nf ? nf.content : 'Chọn một thông báo bên trái.'}</p>
    </div>`;
}

/* 5.6 Hồ sơ cá nhân */
function renderProfileMid(){
  const u = getCurrentUser();

  // Chưa đăng nhập → hiển thị khung "Hồ sơ" + nút mở modal
  if (!u){
    document.getElementById('col-mid').innerHTML = gatePanel('Hồ sơ');
    mountGateButton(); // nút "Đăng nhập" của bạn
    return;
  }

  // Đã đăng nhập
  const email = u.email || '—';
  const display = u.displayName || (u.providerData && u.providerData[0]?.displayName) || '—';

  document.getElementById('col-mid').innerHTML = `
    <div class="panel">
      <h3>Thông tin cá nhân</h3>
      <p><b>Email:</b> ${email}</p>
      <p><b>Tên hiển thị:</b> ${display}</p>
    </div>
  `;
}

function renderProfileRight(){
  const u = getCurrentUser();

  // Chưa đăng nhập → panel "Thành tích" + nút đăng nhập
  if (!u){
    document.getElementById('col-right').innerHTML = gatePanel('Thành tích');
    mountGateButton();
    return;
  }

  // Đã đăng nhập (demo tĩnh giống trước)
  document.getElementById('col-right').innerHTML = `
    <div class="panel">
      <h3>Thành tích</h3>
      <ul class="prose">
        <li>Đọc xong 2 sách</li>
        <li>Hoàn thành 5 nhiệm vụ</li>
      </ul>
    </div>
  `;
}
// Re-render Profile khi user thay đổi
document.addEventListener('NiNi:user-changed', () => {
  const route = String(location.hash || '').replace('#/', '').toLowerCase();
  if (route === 'profile'){
    try { renderProfileMid(); renderProfileRight(); } catch(_){}
  }
});


/* --------------------------- [6] ROUTER --------------------------------- */
const ROUTES = {
  home     : { mid: renderHomeMid,     right: renderHomeRight },
  Gioithieu: { mid: renderIntroMid,    right: renderIntroRight },
  Luatchoi : { mid: renderRulesMid,    right: renderRulesRight },
  Diendan  : { mid: renderForumMid,    right: renderForumRight },
  Lienhe   : { mid: renderContactMid,  right: renderContactRight },

  Video    : { mid: renderVideoLeft,    right: renderVideoRight },
  Game     : { mid: renderGameMid,     right: () => renderGameRight(null) },
  Shop     : { mid: renderShopMid,     right: () => renderShopRight(null) },
  Chat     : { mid: renderChatMid,     right: () => renderChatRight(null) },
  ThongBao : { mid: renderNotifMid,    right: () => renderNotifRight(null) },
  Profile  : { mid: renderProfileMid,  right: renderProfileRight },
};

function getRoute() {
  const h = location.hash.replace(/^#\/?/, '');
  return h || 'home';
}
function go(route) {
  const r = ROUTES[route] || ROUTES.home;
  r.mid();
  r.right();
  // Tô đậm icon đang active (nếu muốn)
  document.querySelectorAll('.nini-side .icon-btn').forEach(a=>{
    a.classList.toggle('active', a.dataset.route === route);
  });
}

/* ========================= Storybook Loader + Reader ===================== */
/* Tiny helpers */
async function fetchJSON(url) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return r.json();
}
function qs(s, r = document) { return r.querySelector(s); }

/* State cho reader */
window.NiNiStory = {
  book: null,        // JSON cuốn hiện tại
  pages: [],         // mảng trang
  idx: 0,            // page index
  lang: "vi"         // 'vi' | 'en'
};

/* 1) Tải & dựng danh sách sách vào cột giữa */
async function loadLibraryTo(selector) {
  const host = "/public/content/storybook";
  let manifest;
  try {
    manifest = await fetchJSON(`${host}/library-manifest.json`);
  } catch {
    // phòng trường hợp bạn để nhầm tên file
    manifest = await fetchJSON(`${host}/library-menifest.json`);
  }

  const listEl = qs(selector);
  if (!manifest?.books?.length) {
    listEl.innerHTML = `<div class="lib-card"><div class="lib-cover"></div>
      <div><h4 class="lib-title">Chưa có sách</h4><p class="lib-author muted">Hãy thêm vào manifest.</p></div></div>`;
    return;
  }

  listEl.innerHTML = manifest.books.map(b => `
    <div class="lib-card" data-id="${b.id}">
      <div class="lib-cover">
        <img src="${b.cover.startsWith('/') ? b.cover : '/' + b.cover}" alt="${b.title_vi || b.title_en || b.id}">
      </div>
      <div>
        <h4 class="lib-title">${b.title_vi || b.title_en || b.id}</h4>
        <p class="lib-author">Tác giả: ${b.author || '—'}</p>
      </div>
    </div>
  `).join("");

  // Click 1 cuốn => mở ở cột phải
  listEl.addEventListener("click", async (e) => {
    const card = e.target.closest(".lib-card");
    if (!card) return;
    await openBook(card.dataset.id);
  });
}

/* 2) Khởi tạo hành vi reader ở cột phải (nút ngôn ngữ, prev/next, đọc to) */
function initReaderBehavior() {
  const langBtns = document.querySelectorAll('.reader-controls .btn.small[data-lang]');
  langBtns.forEach(btn => {
    btn.onclick = () => {
      window.NiNiStory.lang = btn.dataset.lang;
      renderCurrentPage();
      // active state
      langBtns.forEach(b => b.classList.toggle('active', b === btn));
    };
  });

  const prev = qs('#prev_page');
  const next = qs('#next_page');
  if (prev) prev.onclick = () => { changePage(-1); };
  if (next) next.onclick = () => { changePage(+1); };

  const speak = qs('#speak_btn');
  if (speak) speak.onclick = speakCurrent;
}

/* 3) Mở 1 cuốn sách theo id trong manifest: B001 => /public/content/storybook/B001.json */
async function openBook(bookId) {
  const path = `/public/content/storybook/${bookId}.json`;
  const data = await fetchJSON(path);

  window.NiNiStory.book = data;
  window.NiNiStory.pages = Array.isArray(data.pages) ? data.pages : [];
  window.NiNiStory.idx = 0;

  // Cập nhật tiêu đề
  const title = (data.title_vi || data.title_en || data.id || 'Story');
  const ttlEl = qs('#reader_title');
  if (ttlEl) ttlEl.textContent = title;

  renderCurrentPage();
}

/* 4) Dựng trang hiện tại */
function renderCurrentPage() {
  const st = window.NiNiStory;
  const page = st.pages[st.idx] || {};

  // Ảnh: bắt tất cả key có thể có
  const imgPath = page.L_image_pr || page.L_image_P || page.L_image || page.image || "";
  const imgEl = qs('#reader_img');
  if (imgEl) {
    if (imgPath) {
      imgEl.src = imgPath.startsWith('/') ? imgPath : '/' + imgPath;
      imgEl.alt = st.book?.title_vi || st.book?.title_en || 'page';
    } else {
      imgEl.removeAttribute('src');
    }
  }

  // Nội dung theo ngôn ngữ
  const text = st.lang === 'en' ? (page.noidung_en || page.text_en || '') 
                                : (page.noidung_vi || page.text_vi || '');
  const textEl = qs('#reader_text');
  if (textEl) textEl.textContent = text || '…';

  // Chỉ số trang
  const pi = qs('#reader_page');
  if (pi) pi.textContent = `${st.idx + 1}/${Math.max(st.pages.length, 1)}`;

  // Vô hiệu nút đầu/cuối
  const prev = qs('#prev_page'), next = qs('#next_page');
  if (prev) prev.disabled = st.idx <= 0;
  if (next) next.disabled = st.idx >= st.pages.length - 1;
}

/* 5) Chuyển trang */
function changePage(step) {
  const st = window.NiNiStory;
  const n = st.idx + step;
  if (n < 0 || n >= st.pages.length) return;
  st.idx = n;
  renderCurrentPage();
}

/* 6) Đọc to trang hiện tại */
function speakCurrent() {
  const st = window.NiNiStory;
  const page = st.pages[st.idx] || {};
  const text = st.lang === 'en' ? (page.noidung_en || page.text_en || '')
                                : (page.noidung_vi || page.text_vi || '');
  if (!('speechSynthesis' in window)) {
    alert('Trình duyệt không hỗ trợ đọc to.');
    return;
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = (st.lang === 'en') ? 'en-US' : 'vi-VN';
  window.speechSynthesis.speak(u);
}

/* --------------------------- [7] BOOT ----------------------------------- */
(function boot(){
  const root = document.getElementById('stage');
  renderStage(root);
  // route hiện tại hoặc mặc định
  go(getRoute());
  // hashchange
  window.addEventListener('hashchange', () => go(getRoute()));
})();












