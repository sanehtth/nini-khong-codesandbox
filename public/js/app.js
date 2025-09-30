/* NiNi — App JS (full, đã chỉnh theo ONE STYLE) */
(() => {
  const IMAGES = {
    home:   "/public/assets/bg/nini_home.webp",
    spring: "/public/assets/images/seasons/spring.webp",
    summer: "/public/assets/images/seasons/summer.webp",
    autumn: "/public/assets/images/seasons/autumn.webp",
    winter: "/public/assets/images/seasons/winter.webp",
  };
  const LIB_MANIFEST_URL = "/public/content/storybook/library-manifest.json";
  const BOOK_URL = (id) => `/public/content/storybook/${id}.json`;

  const $  = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

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

    if (season === "spring") renderShelfInFrame();
    else { const mount = $("#shelfMount"); if (mount) mount.hidden = true, mount.innerHTML = ""; }
  }
  function bootSeasonFromHash() {
    const raw = (location.hash || "").replace(/^#\/?/, "");
    const s = (raw || "home").toLowerCase();
    setSeason(IMAGES[s] ? s : "home");
  }
  tabs.forEach(btn => btn.addEventListener("click", () => setSeason(btn.dataset.season)));

  const chips = $$(".chip");
  const SECTIONS = {
    intro: `<h2>NiNi — Funny</h2>
      <p>... (giới thiệu) ...</p>`,
    rules: `<h2>Luật chơi</h2><p>...</p>`,
    forum: `<h2>Diễn đàn</h2><p>...</p>`,
    feedback: `<h2>Góp ý</h2><p>...</p>`,
  };
  chips.forEach(ch => ch.addEventListener("click", () => {
    chips.forEach(c => c.classList.toggle("is-active", c === ch));
    if (content) content.innerHTML = SECTIONS[ch.dataset.section] || SECTIONS.intro;
  }));

  /* ===== AUTH MODAL opener — dùng #btnLogin cho thống nhất ===== */
  const authBtn = $("#btnLogin");
  const authModal = $("#authModal");
  const closeEls  = authModal ? $$("[data-close]", authModal) : [];
  const tabLines  = authModal ? $$("#authTabs .tab-line", authModal) : [];
  const panes     = authModal ? $$(".form", authModal) : [];
  function openAuth(which = "login") {
    if (!authModal) return;
    authModal.setAttribute("aria-hidden", "false"); switchAuth(which);
  }
  function closeAuth(){ authModal?.setAttribute("aria-hidden","true"); }
  function switchAuth(which){ tabLines.forEach(t=>t.classList.toggle("is-active",t.dataset.auth===which)); panes.forEach(p=>p.classList.toggle("is-active",p.dataset.pane===which)); }
  authBtn?.addEventListener("click", ()=>openAuth("login"));
  closeEls.forEach(el=>el.addEventListener("click", closeAuth));
  authModal?.addEventListener("click", e=>{ if (e.target===authModal || e.target.classList.contains("modal__backdrop")) closeAuth(); });
  tabLines.forEach(t=>t.addEventListener("click", ()=>switchAuth(t.dataset.auth)));

  /* ===== Shelf in frame ===== */
  let libraryManifest=null;
  async function fetchJSON(url){ const r=await fetch(url,{cache:"no-store"}); if(!r.ok) throw new Error(r.status); return r.json(); }
  async function loadLibraryManifest(){ if(libraryManifest) return libraryManifest; try{ libraryManifest=await fetchJSON(LIB_MANIFEST_URL); return libraryManifest; }catch{ return null; } }
  function tplBookCard(b){
    const cover=b.cover || "/public/assets/bg/nini_home.webp";
    const title=b.title_vi || b.title_en || b.id || "NiNi book";
    const meta=b.author ? `Tác giả: ${b.author}` : "";
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
      mount.innerHTML=`<div class="shelf-card">Chưa có sách.</div>`; return;
    }
    const html = `<div class="shelf"><h3 class="shelf__title">Kệ sách</h3><div class="shelf__grid">${data.books.map(tplBookCard).join("")}</div></div>`;
    mount.hidden=false; mount.classList.add("shelf-card"); mount.innerHTML=html;
    mount.querySelectorAll(".book-card").forEach(card=>{
      card.addEventListener("click",()=>openBookById(card.dataset.book));
    });
  }
  async function openBookById(id){ try{ const book=await fetchJSON(BOOK_URL(id)); openReaderCalendar(book); }catch{ alert("Không mở được sách."); } }

  /* ===== Reader core (rút gọn – giữ API cũ của bạn) ===== */
  const readerModal  = $("#readerModal");
  const calViewport  = $("#calendarViewport");
  const calBg        = $("#calendarBg");
  const btnPrevImg   = $("#imgPrev");
  const btnNextImg   = $("#imgNext");
  const btnLangVi = $("#btnLangVi");
  const btnLangEn = $("#btnLangEn");
  const btnSpeak  = $("#btnSpeak");
  const btnReaderClose = readerModal && $('[data-reader-close]', readerModal);

  let currentBook=null, pageIdx=0; let speakLang=localStorage.getItem("reader_lang")||"vi";
  function pageTextVi(p={}){return p.text_vi||p.noidung_vi||""}
  function pageTextEn(p={}){return p.text_en||p.noidung_en||""}
  function pickPageImage(p={}){return p.image||p.L_image_P||p.img||p.L_image||""}
  function renderSubtitle(){ const el=$("#subtitleText"); if(!el||!currentBook) return; const p=(currentBook.pages||[])[pageIdx]||{}; el.textContent = speakLang==="en"?pageTextEn(p):pageTextVi(p); }
  function renderPageCounter(){ const total=(currentBook?.pages||[]).length||1; const txt=`Trang ${Math.min(pageIdx+1,total)}/${total}`; const elTop=$("#pageCounterTop"); if(elTop) elTop.textContent=txt; }
  function setLoading(on){ if(!calViewport) return; calViewport.classList.toggle("is-loading",!!on); calViewport.classList.toggle("is-ready",!on); }
  function renderCalendarPage(){
    if(!calViewport||!calBg||!currentBook) return;
    const pages=currentBook.pages||[]; const p=pages[pageIdx]||{};
    setLoading(true); renderPageCounter(); renderSubtitle();
    const url=pickPageImage(p); if(!url){ calBg.style.backgroundImage=""; setLoading(false); return; }
    const tmp=new Image(); tmp.onload=()=>{ calBg.style.backgroundImage=`url("${url}")`; setLoading(false); }; tmp.onerror=()=>{ calBg.style.backgroundImage=""; setLoading(false); }; tmp.src=url;
  }
  function openReaderCalendar(book){ currentBook=book; pageIdx=0; const h=readerModal&&$("#readerTitle",readerModal); if(h) h.textContent=book.title_vi||book.title_en||book.id||"NiNi Book"; readerModal?.setAttribute("aria-hidden","false"); setLang(speakLang); renderCalendarPage(); }
  function closeReader(){ readerModal?.setAttribute("aria-hidden","true"); }
  function setLang(lang){ speakLang=lang==="en"?"en":"vi"; localStorage.setItem("reader_lang",speakLang); [btnLangVi,btnLangEn].forEach(b=>b&&b.classList.remove("is-active")); if(speakLang==="vi") btnLangVi?.classList.add("is-active"); else btnLangEn?.classList.add("is-active"); renderSubtitle(); }
  btnPrevImg?.addEventListener("click",()=>{ if(!currentBook) return; if(pageIdx>0){ pageIdx--; renderCalendarPage(); }});
  btnNextImg?.addEventListener("click",()=>{ if(!currentBook) return; const total=(currentBook.pages||[]).length||0; if(pageIdx<total-1){ pageIdx++; renderCalendarPage(); }});
  btnLangVi?.addEventListener("click",()=>setLang("vi"));
  btnLangEn?.addEventListener("click",()=>setLang("en"));
  btnReaderClose?.addEventListener("click", closeReader);
  readerModal?.addEventListener("click", e=>{ if(e.target===readerModal || e.target.classList.contains("modal__backdrop")) closeReader(); });
  setLang(speakLang);

  /* ===== Admin hotkey ===== */
  (() => {
    const ADMIN_KEY="nini_admin_btn";
    const adminBtn=document.getElementById("adminBtn");
    if(!adminBtn) return;
    const saved=localStorage.getItem(ADMIN_KEY);
    if(saved==="on") adminBtn.classList.remove("is-hidden");
    window.addEventListener("keydown",(e)=>{ if(e.altKey && (e.key==="a"||e.key==="A")){ e.preventDefault(); adminBtn.classList.toggle("is-hidden"); localStorage.setItem(ADMIN_KEY, adminBtn.classList.contains("is-hidden")?"off":"on"); }});
  })();

  /* ===== Startup ===== */
  bootSeasonFromHash();
  window.addEventListener("hashchange", bootSeasonFromHash);
  Object.values(IMAGES).forEach(src=>{ const i=new Image(); i.src=src; });
})();
