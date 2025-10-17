/* =========================================================================
   NiNi — Stage: Layout + Storybook + Reader (no Tailwind, không đè header)
   - Render layout 3 khu: Sidebar (icon), Cột giữa (danh sách sách), Cột phải (Reader)
   - Đọc manifest & book JSON từ /public/content/storybook
   - Ảnh TRANG: dùng đúng URL trong JSON (L_image_P, l_image_p, image...), fallback .png
   - Không tái-attached event nhiều lần; chỉ bind 1 lần
   - Các block được “khóa” bằng mốc HẾT PHẦN ... để bạn dễ tra cứu
   ======================================================================== */

/* =============================== [A] CONSTANTS =========================== */
const SB_MANIFEST_URL = '/public/content/storybook/library-manifest.json';
const SB_MANIFEST_URL_FALLBACK = '/public/content/storybook/library-menifest.json'; // phòng khi còn file cũ
const SB_BOOK_JSON = (id) => `/public/content/storybook/${id}.json`;

const ICONS = [
  { key: 'storybook', label: 'Storybook', icon: '/public/assets/icons/book.webp' },
  { key: 'video',     label: 'Video',     icon: '/public/assets/icons/video.webp' },
  { key: 'game',      label: 'Game',      icon: '/public/assets/icons/game.webp' },
  { key: 'shop',      label: 'Shop',      icon: '/public/assets/icons/shop.webp' },
  { key: 'notify',    label: 'Thông báo', icon: '/public/assets/icons/bell.webp' },
  { key: 'chat',      label: 'Chat',      icon: '/public/assets/icons/chat.webp' },
  { key: 'settings',  label: 'Cài đặt',   icon: '/public/assets/icons/setting.webp' },
  { key: 'profile',   label: 'Cá nhân',   icon: '/public/assets/icons/user.webp' },
];

/* ===== HẾT PHẦN [A] CONSTANTS ========================================== */


/* =============================== [B] STATE ============================== */
const StageState = {
  lang: 'vi',
  books: [],
  activeBook: null,   // meta của sách đang mở (từ manifest)
  activeData: null,   // dữ liệu sách đang đọc (từ B001.json...)
  pageIndex: 0,
  _bound: false,
};
/* ===== HẾT PHẦN [B] STATE ============================================== */


/* =============================== [C] HELPERS ============================ */
// Giữ nguyên đường dẫn từ JSON, đảm bảo có dấu "/"
function withRoot(u){ return u ? (u.startsWith('/') ? u : '/' + u) : u; }

// Gán ảnh + fallback .png nếu .webp lỗi
function setImageWithFallback(imgEl, url){
  if (!imgEl) return;
  if (!url){ imgEl.removeAttribute('src'); imgEl.alt = ''; return; }
  const abs = withRoot(url);
  imgEl.onerror = null;
  imgEl.src = abs;
  imgEl.onerror = () => {
    const png = abs.replace(/\.webp(\?.*)?$/i, '.png$1');
    if (png !== imgEl.src) imgEl.src = png;
  };
}

// Lấy URL ảnh TRANG theo đúng khóa bạn đang dùng (không ép schema)
function getPageImageURL(page, lang){
  if (!page) return null;
  // nếu tương lai có theo ngôn ngữ
  if (lang === 'en' && page.l_image_en) return page.l_image_en;
  if (lang !== 'en' && page.l_image_vi) return page.l_image_vi;

  // khóa thực tế bạn đang dùng
  if (page.L_image_P) return page.L_image_P;

  // alias phòng hờ
  if (page.l_image_p) return page.l_image_p;
  if (page.image)    return page.image;
  if (page.src)      return page.src;
  if (page.img)      return page.img;

  // bắt mọi khóa chứa 'image'
  for (const k of Object.keys(page)){
    if (/image/i.test(k) && typeof page[k] === 'string') return page[k];
  }
  return null;
}

// Safe text cho UI
function text(t){ return (t ?? '').toString(); }

/* ===== HẾT PHẦN [C] HELPERS ============================================ */


/* =============================== [D] TEMPLATES ========================== */
function layoutHTML(){
  return `
  <div class="nini-layout">
    <!-- Sidebar -->
    <aside class="nini-side glass">
      <div class="side-icons" id="sb_icons"></div>
    </aside>

    <!-- Cột giữa: Storybook list -->
    <section class="storybook panel glass">
      <div class="sb-head">
        <span style="font-weight:800">Storybook</span>
      </div>
      <div class="lib-grid" id="lib_grid"></div>
    </section>

    <!-- Cột phải: Reader -->
    <section class="panel glass story-reader" id="reader_panel" aria-live="polite">
      <div class="panel-head">
        <h2 id="reader_title" style="margin:0"></h2>
        <div class="reader-controls">
          <button class="btn small" data-lang="vi" id="btn_vi" title="Tiếng Việt">VI</button>
          <button class="btn small" data-lang="en" id="btn_en" title="English">EN</button>
          <button class="btn small" id="btn_sound" title="Phát/Đừng âm thanh">🔊</button>
          <button class="btn small" id="btn_close" title="Đóng">Đóng</button>
        </div>
      </div>

      <div class="reader-stage">
        <div class="reader-image">
          <img id="reader_img" alt="" decoding="async" />
        </div>
        <div class="reader-text" id="reader_text">…</div>
        <div class="reader-nav">
          <button class="btn small" id="btn_prev">‹ Trang trước</button>
          <span class="page-indicator" id="reader_page">1/1</span>
          <button class="btn small" id="btn_next">Trang sau ›</button>
        </div>
      </div>
    </section>
  </div>
  `;
}

// thẻ icon trái
function iconBtnHTML(it){
  return `
    <a class="icon-btn" href="#" data-key="${it.key}">
      <span class="icon">
        <img src="${withRoot(it.icon)}" alt="" loading="lazy" width="28" height="28">
      </span>
      <span class="lbl">${text(it.label)}</span>
    </a>
  `;
}

// thẻ sách trong list
function bookCardHTML(b){
  return `
    <article class="lib-card" data-book="${text(b.id)}" role="button" tabindex="0" aria-label="${text(b.title_vi)}">
      <div class="lib-cover"><img alt="" width="64" height="64" loading="lazy"></div>
      <div>
        <h4 class="lib-title">${text(b.title_vi)}</h4>
        <p class="lib-author">Tác giả: ${text(b.author)}</p>
      </div>
    </article>
  `;
}
/* ===== HẾT PHẦN [D] TEMPLATES ========================================= */


/* =============================== [E] RENDER ============================= */
function renderBase(root){
  root.innerHTML = layoutHTML();

  // Sidebar
  const iconWrap = root.querySelector('#sb_icons');
  iconWrap.innerHTML = ICONS.map(iconBtnHTML).join('');

  // Reader trạng thái trống ban đầu
  setReaderHeader({ title_vi: 'NiNi — Storybook' });
  setReaderPageText('Hãy chọn một truyện ở cột giữa để bắt đầu nhé!');
  updatePageIndicator(0, 0);
}

// Header của reader (tiêu đề & nút VI/EN active)
function setReaderHeader(meta){
  const h = document.querySelector('#reader_title');
  h.textContent = meta ? (meta.title_vi || meta.title || 'Storybook') : 'Storybook';

  document.querySelector('#btn_vi').classList.toggle('active', StageState.lang === 'vi');
  document.querySelector('#btn_en').classList.toggle('active', StageState.lang === 'en');
}

function setReaderImage(url){
  const el = document.querySelector('#reader_img');
  setImageWithFallback(el, url);
}

function setReaderPageText(txt){
  const el = document.querySelector('#reader_text');
  el.textContent = txt || '...';
}

function updatePageIndicator(i, total){
  const el = document.querySelector('#reader_page');
  if (!total || total <= 0) el.textContent = '0/0';
  else el.textContent = `${i+1}/${total}`;
}
/* ===== HẾT PHẦN [E] RENDER ============================================= */


/* =============================== [F] DATA FETCH ========================= */
async function fetchJSON(url){
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status} @ ${url}`);
  return res.json();
}

async function loadManifest(){
  try{
    return await fetchJSON(SB_MANIFEST_URL);
  }catch(e){
    // fallback nếu vẫn dùng tên menifest cũ
    return await fetchJSON(SB_MANIFEST_URL_FALLBACK);
  }
}

async function loadBookData(bookId){
  const url = SB_BOOK_JSON(bookId);
  return fetchJSON(url);
}
/* ===== HẾT PHẦN [F] DATA FETCH ======================================== */


/* =============================== [G] STORYBOOK LIST ===================== */
function renderBookList(root, books){
  const grid = root.querySelector('#lib_grid');
  grid.innerHTML = books.map(bookCardHTML).join('');

  // gán cover ảnh cho từng card
  grid.querySelectorAll('.lib-card').forEach(card=>{
    const id = card.getAttribute('data-book');
    const meta = books.find(b=>b.id === id);
    const img = card.querySelector('.lib-cover img');
    setImageWithFallback(img, meta?.cover);
  });
}
/* ===== HẾT PHẦN [G] STORYBOOK LIST ===================================== */


/* =============================== [H] READER (LOGIC) ===================== */
function applyPage(){
  const pages = StageState.activeData?.pages || [];
  if (!pages.length){
    setReaderImage(null);
    setReaderPageText('…');
    updatePageIndicator(0,0);
    return;
  }

  const p = pages[StageState.pageIndex] || pages[0];

  const url = getPageImageURL(p, StageState.lang);
  setReaderImage(url);

  const vi = p.noiDung_vi || p.noidung_vi || p.content_vi;
  const en = p.noiDung_en || p.noidung_en || p.content_en;
  setReaderPageText(StageState.lang === 'en' ? (en || vi || '...') : (vi || en || '...'));

  updatePageIndicator(StageState.pageIndex, pages.length);
}

function openBook(meta, data){
  StageState.activeBook = meta || null;
  StageState.activeData = data  || null;
  StageState.pageIndex  = 0;

  setReaderHeader(meta);
  applyPage();
}
/* ===== HẾT PHẦN [H] READER (LOGIC) ===================================== */


/* =============================== [I] EVENTS ============================= */
function bindEventsOnce(root){
  if (StageState._bound) return;
  StageState._bound = true;

  // Sidebar icons (demo): chỉ giữ lại Storybook
  root.querySelector('#sb_icons').addEventListener('click', (e)=>{
    const a = e.target.closest('.icon-btn');
    if (!a) return;
    e.preventDefault();
    const k = a.getAttribute('data-key');
    if (k !== 'storybook') return; // các mục khác tuỳ bạn
    // focusing list khu giữa
    root.querySelector('#lib_grid')?.scrollIntoView({ behavior:'smooth', block:'start' });
  });

  // Click chọn sách ở cột giữa
  root.querySelector('.storybook')?.addEventListener('click', async (e)=>{
    const card = e.target.closest('.lib-card');
    if (!card) return;
    const id = card.getAttribute('data-book');
    const meta = StageState.books.find(b=>b.id === id);
    if (!meta) return;

    try{
      const data = await loadBookData(id);
      openBook(meta, data);
    }catch(err){
      console.error('Load book error', err);
      setReaderHeader({ title_vi: meta.title_vi || 'Storybook' });
      setReaderPageText('Không tải được nội dung. Vui lòng thử lại.');
      setReaderImage(null);
      updatePageIndicator(0,0);
    }
  });

  // Ngôn ngữ
  document.querySelector('#btn_vi')?.addEventListener('click', ()=>{
    StageState.lang = 'vi'; setReaderHeader(StageState.activeBook); applyPage();
  });
  document.querySelector('#btn_en')?.addEventListener('click', ()=>{
    StageState.lang = 'en'; setReaderHeader(StageState.activeBook); applyPage();
  });

  // Prev/Next
  document.querySelector('#btn_prev')?.addEventListener('click', ()=>{
    const total = StageState.activeData?.pages?.length || 0;
    if (!total) return;
    StageState.pageIndex = Math.max(0, StageState.pageIndex - 1);
    applyPage();
  });
  document.querySelector('#btn_next')?.addEventListener('click', ()=>{
    const total = StageState.activeData?.pages?.length || 0;
    if (!total) return;
    StageState.pageIndex = Math.min(total - 1, StageState.pageIndex + 1);
    applyPage();
  });

  // Đóng: đưa reader về trạng thái nhắc chọn sách
  document.querySelector('#btn_close')?.addEventListener('click', ()=>{
    StageState.activeBook = null;
    StageState.activeData = null;
    StageState.pageIndex  = 0;
    setReaderHeader({ title_vi: 'NiNi — Storybook' });
    setReaderPageText('Hãy chọn một truyện ở cột giữa để bắt đầu nhé!');
    setReaderImage(null);
    updatePageIndicator(0,0);
  });
}
/* ===== HẾT PHẦN [I] EVENTS ============================================= */


/* =============================== [J] BOOT =============================== */
async function initStage(){
  const root = document.getElementById('stage');
  if (!root){ console.warn('[stage] #stage not found'); return; }

  // 1) Render layout khung
  renderBase(root);

  // 2) Bind events 1 lần
  bindEventsOnce(root);

  // 3) Tải manifest & hiển thị danh sách sách
  try{
    const manifest = await loadManifest();
    const books = (manifest?.books || []).map(b => ({
      id: b.id,
      title_vi: b.title_vi || b.title || '',
      author: b.author || '',
      cover: withRoot(b.cover || ''),  // cover đã là /public/... trong JSON; withRoot để chắc chắn
    }));
    StageState.books = books;
    renderBookList(root, books);
  }catch(err){
    console.error('[stage] load manifest error', err);
    const grid = root.querySelector('#lib_grid');
    if (grid) grid.innerHTML = `<div class="muted">Không tải được danh sách sách.</div>`;
  }
}
// Tự khởi động ngay
document.addEventListener('DOMContentLoaded', initStage);
/* ===== HẾT PHẦN [J] BOOT =============================================== */
