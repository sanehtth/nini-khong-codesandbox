/* =========================================================================
 * NiNi — App JS (FULL)  v11+
 * - Tabs mùa (Home/Spring/...)
 * - Kệ sách trong #frame (shelfMount)
 * - Reader modal kiểu "tấm lịch 16:9" (ảnh + phụ đề nổi)
 * - Tự dựng DOM reader nếu thiếu (ensureReaderDom)
 * - Vị trí & căn giữa ảnh luôn đúng (max 1120px, aspect-ratio 16/9)
 * ========================================================================= */

/* ----------------------- HẰNG & THAM CHIẾU CỐ ĐỊNH ---------------------- */
const IMAGES = {
  home:  "/public/assets/bg/nini_home.webp",
  spring:"/public/assets/images/seasons/spring.webp",
  summer:"/public/assets/images/seasons/summer.webp",
  autumn:"/public/assets/images/seasons/autumn.webp",
  winter:"/public/assets/images/seasons/winter.webp",
};

const LIB_PATH   = "/public/content/storybook";                // thư mục sách
const MANIFEST   = `${LIB_PATH}/library-manifest.json`;       // manifest thư viện

const tabs    = document.querySelectorAll("#seasonTabs .tab");
const frame   = document.getElementById("frame");
const content = document.getElementById("content");
const shelfMount = document.getElementById("shelfMount");

/* --------------------------- TRẠNG THÁI TOÀN CỤC ------------------------ */
let library = [];             // danh sách sách trên kệ (từ manifest)
let currentBook = null;       // sách đang đọc (nội dung đầy đủ)
let pageIdx = 0;              // trang hiện tại
let speakLang = "vi";         // ngôn ngữ thuyết minh chính (vi|en)

// Các tham chiếu trong reader (được gán sau ensureReaderDom/openReader)
let calendarBg     = null;
let subtitleBubble = null;
let imgPrev        = null;
let imgNext        = null;
let pageInfoEl     = null;

/* ------------------------------ TIỆN ÍCH CƠ BẢN ------------------------ */
async function fetchJSON(url){
  try{
    const res = await fetch(url, {cache:"no-store"});
    if(!res.ok) throw new Error(res.statusText);
    return await res.json();
  }catch(e){
    console.warn("fetchJSON fail:", url, e);
    return null;
  }
}

/* ------------------------------ ĐỔI MÙA / ROUTER ------------------------ */
function setSeason(season) {
  const img = IMAGES[season] || IMAGES.home;

  // nền ngoài khung
  document.documentElement.style.setProperty("--bg-url", `url("${img}")`);
  // nền trong khung
  frame.style.backgroundImage = `url("${img}")`;

  // active tab
  tabs.forEach(b => b.classList.toggle("is-active", b.dataset.season === season));

  // hash router (#/spring)
  const newHash = `#/${season}`;
  if (location.hash !== newHash) {
    history.replaceState({}, "", newHash);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }

  // Nếu là spring → hiển thị kệ sách trong khung; tab khác thì ẩn
  if (season === "spring") {
    shelfMount.hidden = false;
    renderShelf();
  } else {
    shelfMount.hidden = true;
  }
}

function bootSeasonFromHash() {
  const raw = (location.hash || "").replace(/^#\/?/, "");
  const s = (raw || "home").toLowerCase();
  setSeason(IMAGES[s] ? s : "home");
}

tabs.forEach(btn => {
  btn.addEventListener("click", () => setSeason(btn.dataset.season));
});

/* ----------------------------- NỘI DUNG 4 CHIP -------------------------- */
const chips = document.querySelectorAll(".chip");
const SECTIONS = {
  intro: `<h2>NiNi — Funny</h2>
    <p>Bạn có nghĩ việc học tiếng Anh là một thử thách khó nhằn và đầy áp lực không? Hãy quên đi cách học truyền thống và khám phá một thế giới hoàn toàn mới với <strong>NiNi — Funny</strong>!</p>
    <p>Với slogan "Chơi mê ly, bứt phá tư duy", NiNi-Funny không chỉ là một trò chơi giải trí, mà còn là công cụ giúp bạn:</p>
    <ul>
      <li>Đắm chìm vào cuộc phiêu lưu nhiều màu sắc.</li>
      <li>Học mà như chơi qua các mini-game.</li>
      <li>Phát triển tư duy logic và giải quyết vấn đề.</li>
    </ul>`,
  rules: `<h2>Luật chơi</h2><p>Mỗi mini game có hướng dẫn ngắn ngay trước khi bắt đầu. Chơi vui, công bằng và tôn trọng bạn chơi.</p>`,
  forum: `<h2>Diễn đàn</h2><p>Góc để khoe thành tích, trao đổi mẹo chơi và đặt câu hỏi.</p>`,
  feedback:`<h2>Góp ý</h2><p>Có ý tưởng trò chơi mới hoặc phát hiện lỗi? Hãy góp ý để NiNi tốt hơn!</p>`
};
chips.forEach(ch => {
  ch.addEventListener("click", () => {
    chips.forEach(c => c.classList.toggle("is-active", c === ch));
    content.innerHTML = SECTIONS[ch.dataset.section] || SECTIONS.intro;
  });
});

/* ------------------------------- AUTH MODAL ----------------------------- */
const authBtn   = document.getElementById("authBtn");
const authModal = document.getElementById("authModal");
if (authBtn && authModal){
  const closeEls  = authModal.querySelectorAll("[data-close]");
  const tabLines  = authModal.querySelectorAll("#authTabs .tab-line");
  const panes     = authModal.querySelectorAll(".form");

  function openAuth(which = "login") {
    authModal.setAttribute("aria-hidden", "false");
    switchAuth(which);
  }
  function closeAuth() {
    authModal.setAttribute("aria-hidden", "true");
  }
  function switchAuth(which) {
    tabLines.forEach(t => t.classList.toggle("is-active", t.dataset.auth === which));
    panes.forEach(p => p.classList.toggle("is-active", p.dataset.pane === which));
  }
  authBtn.addEventListener("click", () => openAuth("login"));
  closeEls.forEach(el => el.addEventListener("click", closeAuth));
  authModal.addEventListener("click", e => {
    if (e.target === authModal || e.target.classList.contains("modal__backdrop")) closeAuth();
  });
  tabLines.forEach(t => t.addEventListener("click", () => switchAuth(t.dataset.auth)));
}

/* ============================== KỆ SÁCH ================================= */
/** Render danh mục sách trong #frame (nằm trong khung, có hiệu ứng nền). */
async function renderShelf(){
  // tải manifest nếu chưa có
  if (!library || library.length === 0){
    const m = await fetchJSON(MANIFEST);
    library = Array.isArray(m?.books) ? m.books : [];
  }

  // HTML Cards
  const html = library.map(b => `
    <article class="book-card" data-book="${b.id}">
      <img class="book-card__cover" src="${b.cover || '/public/assets/bg/nini_home.webp'}" alt="${b.title_vi || b.title_en || b.id}">
      <div class="book-card__body">
        <h4 class="book-card__title">${b.title_vi || b.title_en || b.id}</h4>
        <div class="book-card__meta">Tác giả: ${b.author || ""}</div>
      </div>
    </article>
  `).join("");

  shelfMount.innerHTML = `
    <div class="shelf">
      <h3 class="shelf__title">Kệ sách</h3>
      <div class="shelf__grid">${html || `<div class="muted">Chưa có sách. Đặt <code>${MANIFEST}</code> và các file <code>${LIB_PATH}/&lt;ID&gt;.json</code>.</div>`}</div>
    </div>
  `;

  // click mở reader
  shelfMount.querySelectorAll(".book-card").forEach(card=>{
    card.addEventListener("click", ()=> openReader(card.dataset.book));
  });
}

/* =================== TỰ DỰNG MODAL READER NẾU THIẾU ==================== */
/** Tạo DOM + CSS cho reader (ảnh 16:9 + phụ đề trong ảnh + Prev/Next). */
function ensureReaderDom() {
  if (document.getElementById("readerModal")) return;

  const style = document.createElement("style");
  style.id = "readerInlineStyles";
  style.textContent = `
    .modal{position:fixed;inset:0;display:none}
    .modal[aria-hidden="false"]{display:block}
    .modal__backdrop{position:absolute;inset:0;background:rgba(0,0,0,.55);backdrop-filter: blur(4px)}
    .modal__panel{position:absolute;inset:0;margin:auto;width:min(1120px,94vw);height:auto;
      background:transparent;border:none;display:grid;place-items:center}
    .modal__close{position:absolute;top:6px;right:10px;font-size:24px;color:#fff;background:transparent;border:none;cursor:pointer;z-index:3}

    .calendar-view{position:relative;width:min(1120px,94vw);aspect-ratio:16/9;border-radius:16px;
      box-shadow:0 22px 60px rgba(0,0,0,.6), inset 0 0 0 1px rgba(255,255,255,.08);overflow:hidden}
    .calendar-bg{position:absolute;inset:0;background:#000 center/cover no-repeat;
      image-rendering:-webkit-optimize-contrast}
    .subtitle-bubble{position:absolute;left:50%;bottom:18px;transform:translateX(-50%);
      max-width:93%; padding:12px 16px; border-radius:12px; color:#fff; line-height:1.55;
      background:rgba(0,0,0,.55);backdrop-filter: blur(4px); box-shadow:0 4px 30px rgba(0,0,0,.25);
      text-align:center}
    .img-nav{position:absolute;inset:auto 0 12px 0; display:flex; justify-content:space-between;
      padding:0 18px; pointer-events:none}
    .pill-nav{pointer-events:auto; border:none; border-radius:999px; padding:10px 12px; cursor:pointer;
      background:rgba(255,255,255,.9)}
    .page-info{position:absolute;left:50%;bottom:12px;transform:translateX(-50%);
      background:rgba(0,0,0,.5); color:#fff; padding:6px 10px; border-radius:999px;font-size:13px}
    .flip-in{animation:flipIn .28s ease}
    @keyframes flipIn{from{transform:scale(.985);opacity:.7}to{transform:scale(1);opacity:1}}
  `;
  document.head.appendChild(style);

  const wrap = document.createElement("div");
  wrap.id = "readerModal";
  wrap.className = "modal";
  wrap.setAttribute("aria-hidden","true");
  wrap.innerHTML = `
    <div class="modal__backdrop" data-reader-close></div>
    <div class="modal__panel" role="dialog" aria-modal="true">
      <button class="modal__close" data-reader-close aria-label="Đóng">×</button>
      <div class="calendar-view" id="calendarView">
        <div class="calendar-bg" id="calendarBg"></div>
        <div class="subtitle-bubble" id="subtitleBubble"></div>
        <div class="img-nav">
          <button class="pill-nav" id="imgPrev">◀</button>
          <button class="pill-nav" id="imgNext">▶</button>
        </div>
        <span class="page-info" id="readerPageInfo"></span>
      </div>
    </div>
  `;
  document.body.appendChild(wrap);
}

/* -------------------------- SPEECH (tùy chọn) -------------------------- */
function speakText(text, langCode){
  try{
    const u = new SpeechSynthesisUtterance(text);
    u.lang = langCode || (speakLang === "vi" ? "vi-VN" : "en-US");
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }catch(_){}
}

/* ============================= OPEN / RENDER ============================ */
/** Mở reader cho bookId (đồng thời dựng DOM nếu thiếu) */
async function openReader(bookId){
  ensureReaderDom(); // <- CHÌA KHÓA: luôn có modal/DOM

  // map lại các tham chiếu trong modal vừa dựng
  const readerModal = document.getElementById("readerModal");
  calendarBg     = document.getElementById("calendarBg");
  subtitleBubble = document.getElementById("subtitleBubble");
  imgPrev        = document.getElementById("imgPrev");
  imgNext        = document.getElementById("imgNext");
  pageInfoEl     = document.getElementById("readerPageInfo");

  // close
  const closeAll = () => {
    readerModal.setAttribute("aria-hidden","true");
    try{ window.speechSynthesis.cancel(); }catch(_){}
  };
  readerModal.querySelectorAll("[data-reader-close]").forEach(el => {
    el.onclick = closeAll;
  });

  // nạp dữ liệu sách
  const meta = library.find(b => b.id === bookId);
  if (!meta){ alert("Không tìm thấy sách."); return; }
  const book = await fetchJSON(`${LIB_PATH}/${bookId}.json`);
  if (!book){ alert("Không đọc được JSON sách."); return; }

  currentBook = { ...meta, ...book };
  pageIdx = 0;

  // nav
  imgPrev.onclick = () => { pageIdx = Math.max(0, pageIdx-1); renderPage(true); };
  imgNext.onclick = () => { pageIdx = Math.min((currentBook.pages?.length||1)-1, pageIdx+1); renderPage(true); };

  readerModal.setAttribute("aria-hidden","false");
  renderPage(false);
}

/** Render một trang của currentBook lên calendar-view */
function renderPage(withFlip){
  if(!currentBook) return;
  const pages = currentBook.pages || [];
  const total = pages.length || 1;
  const p = pages[pageIdx] || {};

  // ảnh nền (16:9) – nếu trang không có image → fallback cover → fallback home
  const img = p.image || currentBook.cover || "/public/assets/bg/nini_home.webp";
  calendarBg.style.backgroundImage = `url("${img}")`;
  if (withFlip){ calendarBg.classList.remove("flip-in"); void calendarBg.offsetWidth; calendarBg.classList.add("flip-in"); }

  // phụ đề nằm trong ảnh: theo chế độ speakLang (VI/EN)
  const text = speakLang === "vi" ? (p.text_vi || "") : (p.text_en || "");
  subtitleBubble.textContent = text;

  // info trang
  pageInfoEl.textContent = `Trang ${pageIdx+1}/${total}`;

  // phím tắt trái/phải
  const onKey = (e)=>{
    if (e.key === "ArrowLeft"){ imgPrev.click(); }
    if (e.key === "ArrowRight"){ imgNext.click(); }
    if (e.key === "Escape"){
      document.getElementById("readerModal")?.setAttribute("aria-hidden","true");
      window.removeEventListener("keydown", onKey);
    }
  };
  window.removeEventListener("keydown", onKey);
  window.addEventListener("keydown", onKey);
}

/* ========================== NGÔN NGỮ THUYẾT MINH ======================= */
/* Hai nút chuyển VI/EN bạn có thể tạo trong index hoặc gắn tạm vào frame */
(function mountQuickLangSwitch(){
  // tạo nút nổi nho nhỏ bên phải subtitle để thử nhanh
  ensureReaderDom(); // để có style modal (re-use)

  // nếu bạn đã có UI riêng thì bỏ block này
  const exist = document.getElementById("quickLangSwitch");
  if (exist) return;
  const div = document.createElement("div");
  div.id = "quickLangSwitch";
  Object.assign(div.style, {
    position:"fixed", right:"14px", bottom:"14px", zIndex:"40",
    display:"flex", gap:"8px"
  });
  div.innerHTML = `
    <button id="qlVi" style="padding:8px 10px;border-radius:999px;border:1px solid rgba(255,255,255,.3);background:rgba(0,0,0,.4);color:#fff;cursor:pointer">VI</button>
    <button id="qlEn" style="padding:8px 10px;border-radius:999px;border:1px solid rgba(255,255,255,.3);background:rgba(0,0,0,.4);color:#fff;cursor:pointer">EN</button>
  `;
  document.body.appendChild(div);
  const recolor = ()=>{
    div.querySelector("#qlVi").style.background = speakLang==="vi"?"#4ade80":"rgba(0,0,0,.4)";
    div.querySelector("#qlEn").style.background = speakLang==="en"?"#60a5fa":"rgba(0,0,0,.4)";
  };
  recolor();
  div.querySelector("#qlVi").onclick = ()=>{ speakLang="vi"; recolor(); renderPage(false); };
  div.querySelector("#qlEn").onclick = ()=>{ speakLang="en"; recolor(); renderPage(false); };
})();

/* ============================== KHỞI ĐỘNG =============================== */
// tải kệ ngay khi mở trang (để lần đầu vào Spring có sẵn dữ liệu)
renderShelf();

// router & preload ảnh nền
bootSeasonFromHash();
window.addEventListener("hashchange", bootSeasonFromHash);
Object.values(IMAGES).forEach(src => { const i = new Image(); i.src = src; });

/* ======================= CSS TỐI THIỂU CHO KỆ SÁCH ====================== */
/* (để kệ hiển thị gọn trong #frame nếu styles.css của bạn chưa có) */
(function injectShelfCss(){
  if (document.getElementById("shelfInlineStyles")) return;
  const x = document.createElement("style");
  x.id = "shelfInlineStyles";
  x.textContent = `
    .shelf{position:absolute; top:16px; left:16px; right:16px; margin:auto; max-width:720px;
      background:rgba(0,0,0,.28); backdrop-filter: blur(6px); border:1px solid rgba(255,255,255,.14);
      border-radius:14px; padding:12px}
    .shelf__title{margin:0 0 10px; font-size:18px}
    .shelf__grid{display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px}
    .book-card{display:flex; gap:10px; align-items:center; padding:8px; border-radius:12px;
      background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.12); cursor:pointer}
    .book-card:hover{border-color:rgba(255,255,255,.3)}
    .book-card__cover{width:64px;height:64px;object-fit:cover;border-radius:10px;flex:none}
    .book-card__body{min-width:0}
    .book-card__title{margin:0 0 4px; font-size:14px}
    .book-card__meta{font-size:12px; opacity:.75}
  `;
  document.head.appendChild(x);
})();
