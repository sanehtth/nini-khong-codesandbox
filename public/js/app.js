/* NiNi — App JS (full, đã chỉnh)
   - [GIỮ] gọi window.fx.setSeason(season) để sync hiệu ứng rơi
   - [GIỮ] TTS nút 🔊
   - [SỬA] bind click kệ bằng event delegation (ổn định khi re-render)
   - [THÊM] phím tắt reader (←/→/Esc), preload ảnh trang kế/ trước
   - [CẢI THIỆN] hiển thị lỗi fetch rõ ràng, phòng ngừa HashChangeEvent
*/
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

  // ---------------- MÙA ----------------
  function setSeason(season) {
    const img = IMAGES[season] || IMAGES.home;

    document.documentElement.style.setProperty("--bg-url", `url("${img}")`);
    if (frame) frame.style.backgroundImage = `url("${img}")`;

    tabs.forEach(b => b.classList.toggle("is-active", b.dataset.season === season));

    // sync hiệu ứng rơi theo mùa
    if (window.fx && typeof window.fx.setSeason === "function") {
      window.fx.setSeason(season);
    }

    const newHash = `#/${season}`;
    if (location.hash !== newHash) {
      // replaceState không tự bắn hashchange -> ta chủ động bắn (nếu browser không hỗ trợ HashChangeEvent, dùng CustomEvent)
      history.replaceState({}, "", newHash);
      try {
        window.dispatchEvent(new HashChangeEvent("hashchange"));
      } catch {
        window.dispatchEvent(new CustomEvent("hashchange"));
      }
    }

    if (season === "spring") {
      renderShelfInFrame();
    } else {
      const mount = $("#shelfMount");
      if (mount) {
        mount.hidden = true;
        mount.innerHTML = "";
      }
    }
  }

  function bootSeasonFromHash() {
    const raw = (location.hash || "").replace(/^#\/?/, "");
    const s = (raw || "home").toLowerCase();
    setSeason(IMAGES[s] ? s : "home");
  }

  tabs.forEach(btn => btn.addEventListener("click", () => setSeason(btn.dataset.season)));

  // ---------------- NỘI DUNG CHÍP ----------------
  const chips = $$(".chip");
  const SECTIONS = {
    intro: `<h2>NiNi — Funny</h2><p>...</p>`,
    rules: `<h2>Luật chơi</h2><p>...</p>`,
    forum: `<h2>Diễn đàn</h2><p>...</p>`,
    feedback: `<h2>Góp ý</h2>
      <p>Gửi góp ý: <a href="mailto:support@nini-funny.com">support@nini-funny.com</a></p>
      <p>Kỹ thuật: <a href="mailto:admin@nini-funny.com">admin@nini-funny.com</a></p>`,
  };
  chips.forEach(ch => ch.addEventListener("click", () => {
    chips.forEach(c => c.classList.toggle("is-active", c === ch));
    if (content) content.innerHTML = SECTIONS[ch.dataset.section] || SECTIONS.intro;
  }));

  // ---------------- AUTH MODAL (không đụng auth.js) ----------------
  const authBtn   = $("#authBtn");
  const authModal = $("#authModal");
  const closeEls  = authModal ? $$("[data-close]", authModal) : [];
  const tabLines  = authModal ? $$("#authTabs .tab-line", authModal) : [];
  const panes     = authModal ? $$(".form", authModal) : [];

  function openAuth(which = "login") {
    if (!authModal) return;
    authModal.setAttribute("aria-hidden", "false");
    switchAuth(which);
  }
  function closeAuth() { authModal?.setAttribute("aria-hidden","true"); }
  function switchAuth(which) {
    tabLines.forEach(t => t.classList.toggle("is-active", t.dataset.auth === which));
    panes.forEach(p => p.classList.toggle("is-active", p.dataset.pane === which));
  }
  authBtn?.addEventListener("click", () => openAuth("login"));
  closeEls.forEach(el => el.addEventListener("click", closeAuth));
  authModal?.addEventListener("click", e => {
    if (e.target === authModal || e.target.classList.contains("modal__backdrop")) closeAuth();
  });
  tabLines.forEach(t => t.addEventListener("click", () => switchAuth(t.dataset.auth)));

  // ---------------- KỆ SÁCH ----------------
  let libraryManifest = null;

  async function fetchJSON(url) {
    let res;
    try {
      res = await fetch(url, { cache:"no-store" });
    } catch (e) {
      throw new Error(`Không thể kết nối: ${url}`);
    }
    if (!res.ok) throw new Error(`Fetch fail ${url}: ${res.status}`);
    return await res.json();
  }

  async function loadLibraryManifest() {
    if (libraryManifest) return libraryManifest;
    try {
      const data = await fetchJSON(LIB_MANIFEST_URL);
      libraryManifest = data;
      return data;
    } catch(e) {
      console.warn("Không đọc được manifest:", e);
      return null;
    }
  }

  function tplBookCard(b) {
    const cover = b.cover || "/public/assets/bg/nini_home.webp";
    const title = b.title_vi || b.title_en || b.id || "NiNi book";
    const meta  = b.author ? `Tác giả: ${b.author}` : "";
    return `
      <article class="book-card" tabindex="0" role="button" aria-label="Mở sách ${title}" data-book="${b.id}">
        <img class="book-card__cover" src="${cover}" alt="${title}">
        <div class="book-card__body">
          <h4 class="book-card__title">${title}</h4>
          <div class="book-card__meta">${meta}</div>
        </div>
      </article>
    `;
  }

  // Delegation: bind 1 lần cho mount
  function bindShelfClicks(mount) {
    if (!mount || mount.__bound) return;
    mount.__bound = true;
    mount.addEventListener("click", (e) => {
      const card = e.target.closest(".book-card");
      if (!card) return;
      openBookById(card.dataset.book);
    });
    // Enter mở sách
    mount.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      const card = e.target.closest(".book-card");
      if (!card) return;
      openBookById(card.dataset.book);
    });
  }

  async function renderShelfInFrame() {
    const mount = $("#shelfMount");
    if (!mount) return;
    const data = await loadLibraryManifest();

    mount.hidden = false;
    if (!data || !Array.isArray(data.books) || !data.books.length) {
      mount.innerHTML = `<div class="shelf-empty">
        Chưa có sách. Đặt <code>${LIB_MANIFEST_URL}</code>
        và các file <code>/public/content/storybook/&lt;ID&gt;.json</code>.
      </div>`;
      bindShelfClicks(mount);
      return;
    }

    const html = data.books.map(tplBookCard).join("");
    mount.innerHTML = `<div class="shelf">
      <h3 class="shelf__title">Kệ sách</h3>
      <div class="shelf__grid">${html}</div>
    </div>`;

    // đảm bảo mount luôn bắt được click, kể cả sau re-render
    bindShelfClicks(mount);
  }

  async function openBookById(id) {
    try {
      const book = await fetchJSON(BOOK_URL(id));
      openReaderCalendar(book);
    } catch (e) {
      console.error("Không mở được sách:", e);
      alert("Không mở được cuốn sách này. Vui lòng kiểm tra JSON/đường dẫn ảnh.");
    }
  }

  // ---------------- READER + TTS ----------------
  const readerModal  = $("#readerModal");
  const calViewport  = $("#calendarViewport");
  const calBg        = $("#calendarBg");
  const btnPrevImg   = $("#imgPrev");
  const btnNextImg   = $("#imgNext");
  const btnLangVi    = $("#btnLangVi");
  const btnLangEn    = $("#btnLangEn");
  const btnSpeak     = $("#btnSpeak");
  const btnReaderClose = readerModal && $('[data-reader-close]', readerModal);
  const subtitleEl   = $("#subtitleText");
  const pageCounterTop = $("#pageCounterTop");

  let currentBook = null;
  let pageIdx = 0;
  let speakLang = localStorage.getItem("reader_lang") || "vi";

  let isSpeaking = false;
  let speakUtter = null;
  let speakVoices = [];
  function loadVoices() { try { speakVoices = speechSynthesis.getVoices(); } catch { speakVoices = []; } }
  loadVoices();
  if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = loadVoices;
  function pickVoice(lang) {
    if (!speakVoices.length) loadVoices();
    return speakVoices.find(v => v.lang?.toLowerCase().startsWith(lang))
        || speakVoices.find(v => v.lang?.toLowerCase().startsWith("en"))
        || null;
  }
  function stopSpeak(){ isSpeaking=false; try{ speechSynthesis.cancel(); }catch{} }
  function speakCurrent(){
    stopSpeak(); if (!currentBook || !window.SpeechSynthesisUtterance) return;
    const p = (currentBook.pages||[])[pageIdx]||{};
    const text = (speakLang==="en"?pageTextEn(p):pageTextVi(p))||"";
    if (!text.trim()) return;
    speakUtter = new SpeechSynthesisUtterance(text);
    const voice = pickVoice(speakLang==="en"?"en":"vi");
    if (voice) speakUtter.voice = voice;
    speakUtter.rate=1; speakUtter.pitch=1; speakUtter.volume=1;
    speakUtter.onend=()=>{isSpeaking=false;}; speakUtter.onerror=()=>{isSpeaking=false;};
    speechSynthesis.speak(speakUtter); isSpeaking=true;
  }

  function pickPageImage(p={}){ return p.image || p.L_image_P || p.img || p.L_image || ""; }
  function pageTextVi(p={}){ return p.text_vi || p.noidung_vi || ""; }
  function pageTextEn(p={}){ return p.text_en || p.noidung_en || ""; }

  function setLang(lang){
    speakLang = lang==="en"?"en":"vi";
    localStorage.setItem("reader_lang", speakLang);
    [btnLangVi, btnLangEn].forEach(b=>b&&b.classList.remove("is-active"));
    if (speakLang==="vi") btnLangVi?.classList.add("is-active"); else btnLangEn?.classList.add("is-active");
    renderSubtitle();
    if (isSpeaking) speakCurrent();
  }

  function renderSubtitle(){
    if (!subtitleEl || !currentBook) return;
    const p = (currentBook.pages||[])[pageIdx]||{};
    const txt = speakLang==="en"?pageTextEn(p):pageTextVi(p);
    subtitleEl.textContent = txt || "";
  }

  function setLoading(on){
    if (!calViewport) return;
    calViewport.classList.toggle("is-loading", !!on);
    calViewport.classList.toggle("is-ready", !on);
  }

  function renderPageCounter(){
    const total = (currentBook?.pages||[]).length || 1;
    const txt = `Trang ${Math.min(pageIdx+1,total)}/${total}`;
    if (pageCounterTop) pageCounterTop.textContent = txt;
    const elOld = $("#pageCounter");
    if (elOld) elOld.textContent = txt;
  }

  function preloadAround(idx){
    const pages = currentBook?.pages || [];
    [idx-1, idx+1].forEach(i=>{
      const p = pages[i];
      const u = p && pickPageImage(p);
      if (u){ const img=new Image(); img.src=u; }
    });
  }

  function renderCalendarPage(){
    if (!calViewport || !calBg || !currentBook) return;
    const pages = currentBook.pages||[]; const p = pages[pageIdx]||{};
    setLoading(true); renderPageCounter(); renderSubtitle();
    const url = pickPageImage(p);
    if (!url){ calBg.style.backgroundImage=""; setLoading(false); return; }
    const tmp = new Image();
    tmp.onload = ()=>{
      calBg.style.backgroundImage = `url("${url}")`;
      setLoading(false);
      preloadAround(pageIdx);
      if (isSpeaking) speakCurrent();
    };
    tmp.onerror= ()=>{ calBg.style.backgroundImage = ""; setLoading(false); };
    tmp.src = url;
  }

  function openReaderCalendar(book){
    currentBook = book; pageIdx=0;
    const h = readerModal && $("#readerTitle", readerModal);
    if (h) h.textContent = book.title_vi || book.title_en || book.id || "NiNi Book";
    readerModal?.setAttribute("aria-hidden","false");
    setLang(speakLang);
    renderCalendarPage();
  }

  function closeReader(){ stopSpeak(); readerModal?.setAttribute("aria-hidden","true"); }

  btnPrevImg?.addEventListener("click", ()=>{ if(!currentBook) return; if (pageIdx>0){ pageIdx--; renderCalendarPage(); }});
  btnNextImg?.addEventListener("click", ()=>{ if(!currentBook) return; const total=(currentBook.pages||[]).length||0; if(pageIdx<total-1){ pageIdx++; renderCalendarPage(); }});
  btnLangVi?.addEventListener("click", ()=>setLang("vi"));
  btnLangEn?.addEventListener("click", ()=>setLang("en"));
  btnSpeak ?.addEventListener("click", ()=>{ if(isSpeaking) stopSpeak(); else speakCurrent(); });
  btnReaderClose?.addEventListener("click", closeReader);
  readerModal?.addEventListener("click", e=>{ if (e.target===readerModal || e.target.classList.contains("modal__backdrop")) closeReader(); });
  // phím tắt reader
  window.addEventListener("keydown", (e)=>{
    if (readerModal?.getAttribute("aria-hidden") !== "false") return;
    if (e.key === "Escape") closeReader();
    else if (e.key === "ArrowLeft")  btnPrevImg?.click();
    else if (e.key === "ArrowRight") btnNextImg?.click();
  });
  setLang(speakLang);

  // ---------------- Admin hotkey ----------------
  (() => {
    const ADMIN_KEY = "nini_admin_btn";
    const adminBtn = document.getElementById("adminBtn");
    if (!adminBtn) return;
    const saved = localStorage.getItem(ADMIN_KEY);
    if (saved === "on") adminBtn.classList.remove("is-hidden");
    window.addEventListener("keydown",(e)=>{
      if (e.altKey && (e.key==="a"||e.key==="A")){
        e.preventDefault();
        adminBtn.classList.toggle("is-hidden");
        localStorage.setItem(ADMIN_KEY, adminBtn.classList.contains("is-hidden")?"off":"on");
      }
    });
  })();

  // ---------------- Startup ----------------
  bootSeasonFromHash();
  window.addEventListener("hashchange", bootSeasonFromHash);
  Object.values(IMAGES).forEach(src => { const i=new Image(); i.src=src; });

  // đảm bảo kệ luôn nghe click (kể cả khi CSS/DOM thay đổi)
  const mountInit = $("#shelfMount");
  if (mountInit) bindShelfClicks(mountInit);
})();
