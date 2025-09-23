/* NiNi — App JS (FULL, modal reader fixed) */
(() => {
  // ====== CONSTANTS ======
  const IMAGES = {
    home:   "/public/assets/bg/nini_home.webp",
    spring: "/public/assets/images/seasons/spring.webp",
    summer: "/public/assets/images/seasons/summer.webp",
    autumn: "/public/assets/images/seasons/autumn.webp",
    winter: "/public/assets/images/seasons/winter.webp",
  };
  const LIB_MANIFEST_URL = "/public/content/storybook/library-manifest.json";
  const BOOK_URL = (id) => `/public/content/storybook/${id}.json`;

  // helpers
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  // ====== SEASON TABS & BACKGROUND ======
  const tabs    = $$("#seasonTabs .tab");
  const frame   = $("#frame");
  const content = $("#content");

  function setSeason(season) {
    const img = IMAGES[season] || IMAGES.home;
    document.documentElement.style.setProperty("--bg-url", `url("${img}")`);
    if (frame) frame.style.backgroundImage = `url("${img}")`;
    tabs.forEach(b => b.classList.toggle("is-active", b.dataset.season === season));

    const newHash = `#/${season}`;
    if (location.hash !== newHash) {
      history.replaceState({}, "", newHash);
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }

    // show shelf only in spring
    if (season === "spring") renderShelfInFrame();
    else { const m = $("#shelfMount"); if (m) { m.hidden = true; m.innerHTML=""; } }
  }
  function bootSeasonFromHash(){
    const raw = (location.hash||"").replace(/^#\/?/, "");
    const s = (raw||"home").toLowerCase();
    setSeason(IMAGES[s] ? s : "home");
  }
  tabs.forEach(b => b.addEventListener("click", () => setSeason(b.dataset.season)));

  // ====== CHIPS ======
  const chips = $$(".chip");
  const SECTIONS = {
    intro: `<h2>NiNi — Funny</h2>
      <p>Bắt đầu hành trình biến tiếng Anh thành niềm vui bất tận.</p>`,
    rules: `<h2>Luật chơi</h2><p>Chơi vui – công bằng – tôn trọng.</p>`,
    forum: `<h2>Diễn đàn</h2><p>Góc chia sẻ & đặt câu hỏi.</p>`,
    feedback: `<h2>Góp ý</h2><p>support@nini-funny.com</p>`,
  };
  chips.forEach(ch=>ch.addEventListener("click",()=>{
    chips.forEach(c=>c.classList.toggle("is-active", c===ch));
    if (content) content.innerHTML = SECTIONS[ch.dataset.section]||SECTIONS.intro;
  }));

  // ====== AUTH MODAL (giữ nguyên logic) ======
  const authBtn   = $("#authBtn");
  const authModal = $("#authModal");
  const authClose = authModal ? $$("[data-close]", authModal) : [];
  const tabLines  = authModal ? $$("#authTabs .tab-line", authModal) : [];
  const panes     = authModal ? $$(".form", authModal) : [];

  function openAuth(which="login"){ if(!authModal) return; authModal.setAttribute("aria-hidden","false"); switchAuth(which); }
  function closeAuth(){ authModal?.setAttribute("aria-hidden","true"); }
  function switchAuth(which){ tabLines.forEach(t=>t.classList.toggle("is-active", t.dataset.auth===which)); panes.forEach(p=>p.classList.toggle("is-active", p.dataset.pane===which)); }
  authBtn?.addEventListener("click",()=>openAuth("login"));
  authClose.forEach(el=>el.addEventListener("click",closeAuth));
  authModal?.addEventListener("click",e=>{ if(e.target===authModal||e.target.classList.contains("modal__backdrop")) closeAuth(); });
  tabLines.forEach(t=>t.addEventListener("click",()=>switchAuth(t.dataset.auth)));

  // ====== SHELF (kệ sách trong khung) ======
  let libraryManifest = null;
  async function fetchJSON(url){ const r=await fetch(url,{cache:"no-store"}); if(!r.ok) throw new Error(r.status); return r.json(); }
  async function loadLibraryManifest(){ if(libraryManifest) return libraryManifest; try{ libraryManifest=await fetchJSON(LIB_MANIFEST_URL); return libraryManifest; }catch(e){ console.warn("Manifest fail",e); return null; } }
  function tplBookCard(b){
    const cover=b.cover||"/public/assets/bg/nini_home.webp";
    const title=b.title_vi||b.title_en||b.id||"NiNi Book";
    const meta=b.author?`Tác giả: ${b.author}`:"";
    return `<article class="book-card" data-book="${b.id}">
      <img class="book-card__cover" src="${cover}" alt="${title}">
      <div class="book-card__body"><h4 class="book-card__title">${title}</h4><div class="book-card__meta">${meta}</div></div>
    </article>`;
  }
  async function renderShelfInFrame(){
    const mount=$("#shelfMount"); if(!mount) return;
    const data=await loadLibraryManifest();
    if(!data||!Array.isArray(data.books)||!data.books.length){
      mount.hidden=false;
      mount.innerHTML=`<div class="shelf-empty">Chưa có sách. Hãy đặt <code>${LIB_MANIFEST_URL}</code> và các file <code>/public/content/storybook/&lt;ID&gt;.json</code>.</div>`;
      return;
    }
    mount.hidden=false;
    mount.innerHTML=`<div class="shelf"><h3 class="shelf__title">Kệ sách</h3><div class="shelf__grid">${data.books.map(tplBookCard).join("")}</div></div>`;
    mount.querySelectorAll(".book-card").forEach(card=>{
      card.addEventListener("click",()=>openBookById(card.dataset.book));
    });
  }
  async function openBookById(id){
    try{ const book=await fetchJSON(BOOK_URL(id)); openReaderCalendar(book); }
    catch(e){ console.error(e); alert("Không mở được sách. Kiểm tra JSON/đường dẫn ảnh."); }
  }

  // ====== READER (SCOPED TRONG MODAL) ======
  const readerModal  = $("#readerModal");
  // mọi selector bên trong modal để tránh đụng phần tử “rơi rớt” ngoài trang
  const qM = (s)=> readerModal?.querySelector(s);

  const calViewport = qM("#calendarViewport");
  const calBg       = qM("#calendarBg");
  const btnPrevImg  = qM("#imgPrev");
  const btnNextImg  = qM("#imgNext");
  const btnLangVi   = qM("#langVi");
  const btnLangEn   = qM("#langEn");
  const btnClose    = qM("[data-reader-close]");
  const elSubtitle  = qM("#subtitleBubble");
  const elPageInfo  = qM("#readerPageInfo");
  const elTitle     = qM("#readerTitle");

  let currentBook=null, pageIdx=0;
  let speakLang = localStorage.getItem("reader_lang") || "vi";

  function pickPageImage(p={}){ return p.image||p.L_image_P||p.img||p.L_image||""; }
  const pageTextVi = (p={})=> p.text_vi||p.noidung_vi||"";
  const pageTextEn = (p={})=> p.text_en||p.noidung_en||"";

  function setLang(lang){
    speakLang = lang==="en" ? "en" : "vi";
    localStorage.setItem("reader_lang", speakLang);
    btnLangVi?.classList.toggle("is-active", speakLang==="vi");
    btnLangEn?.classList.toggle("is-active", speakLang==="en");
    renderSubtitle();
  }
  function renderSubtitle(){
    if(!elSubtitle||!currentBook) return;
    const p=(currentBook.pages||[])[pageIdx]||{};
    elSubtitle.textContent = speakLang==="en" ? pageTextEn(p) : pageTextVi(p);
  }
  function setLoading(on){ calViewport?.classList.toggle("is-loading", !!on); }

  function renderPageCounter(){
    if(!elPageInfo||!currentBook) return;
    const total=(currentBook.pages||[]).length||1;
    elPageInfo.textContent=`Trang ${Math.min(pageIdx+1,total)}/${total}`;
  }

  function renderCalendarPage(){
    if(!readerModal||!calBg||!currentBook) return;
    const p = (currentBook.pages||[])[pageIdx] || {};
    const url = pickPageImage(p);
    setLoading(true);
    renderPageCounter(); renderSubtitle();

    if(!url){ calBg.style.backgroundImage=""; setLoading(false); return; }
    const img=new Image();
    img.onload=()=>{ calBg.style.backgroundImage=`url("${url}")`; setLoading(false); };
    img.onerror=()=>{ calBg.style.backgroundImage=""; setLoading(false); };
    img.src=url;
  }

  function openReaderCalendar(book){
    currentBook = book; pageIdx=0;
    if(elTitle) elTitle.textContent = book.title_vi||book.title_en||book.id||"NiNi Book";
    readerModal?.setAttribute("aria-hidden","false");
    renderCalendarPage();
  }
  function closeReader(){ readerModal?.setAttribute("aria-hidden","true"); }

  // nav + lang + close
  btnPrevImg?.addEventListener("click",()=>{ if(!currentBook) return; if(pageIdx>0){ pageIdx--; renderCalendarPage(); }});
  btnNextImg?.addEventListener("click",()=>{ if(!currentBook) return; const total=(currentBook.pages||[]).length||0; if(pageIdx<total-1){ pageIdx++; renderCalendarPage(); }});
  btnLangVi?.addEventListener("click",()=>setLang("vi"));
  btnLangEn?.addEventListener("click",()=>setLang("en"));
  btnClose?.addEventListener("click", closeReader);
  readerModal?.addEventListener("click", e => {
    if(e.target===readerModal || e.target.classList.contains("modal__backdrop")) closeReader();
  });
  setLang(speakLang);

  // ====== STARTUP ======
  bootSeasonFromHash();
  window.addEventListener("hashchange", bootSeasonFromHash);
  Object.values(IMAGES).forEach(src=>{ const i=new Image(); i.src=src; });
})();
