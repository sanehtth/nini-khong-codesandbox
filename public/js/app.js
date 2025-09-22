/* ============================================================
 * NiNi — App JS (seasons + shelf-in-frame + calendar reader)
 * ============================================================ */
(() => {
  /* =========================
   * [1] SEASONS / ROUTER
   * ========================= */
  const IMAGES = {
    home:  "/public/assets/bg/nini_home.webp",
    spring:"/public/assets/images/seasons/spring.webp",
    summer:"/public/assets/images/seasons/summer.webp",
    autumn:"/public/assets/images/seasons/autumn.webp",
    winter:"/public/assets/images/seasons/winter.webp",
  };

  const tabs       = document.querySelectorAll("#seasonTabs .tab");
  const frame      = document.getElementById("frame");
  const content    = document.getElementById("content");
  const shelfMount = document.getElementById("shelfMount"); // NOTE: div rỗng bên trong .frame

  function setSeason(season) {
    const img = IMAGES[season] || IMAGES.home;

    // nền ngoài & trong khung
    document.documentElement.style.setProperty("--bg-url", `url("${img}")`);
    if (frame) frame.style.backgroundImage = `url("${img}")`;

    tabs.forEach(b => b.classList.toggle("is-active", b.dataset.season === season));

    // chuẩn hóa hash #/season
    const newHash = `#/${season}`;
    if (location.hash !== newHash) {
      history.replaceState({}, "", newHash);
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }

    // Kệ sách trong tab Spring
    if (season === "spring") {
      if (shelfMount) shelfMount.hidden = false;
      loadLibrary().then(renderShelfInFrame);
    } else {
      if (shelfMount) { shelfMount.hidden = true; shelfMount.innerHTML = ""; }
      if (content) content.innerHTML = SECTIONS.intro;
    }
  }

  function bootSeasonFromHash() {
    const raw = (location.hash || "").replace(/^#\/?/, "");
    const s = (raw || "home").toLowerCase();
    setSeason(IMAGES[s] ? s : "home");
  }

  tabs.forEach(btn => btn.addEventListener("click", () => setSeason(btn.dataset.season)));

  /* =========================
   * [2] STYLE TOGGLER (optional)
   * ========================= */
  const btnStyle = document.getElementById("toggleStyle");
  const savedStyle = localStorage.getItem("ui_style");
  if (savedStyle === "modern") {
    document.body.classList.add("theme-modern");
    if (btnStyle) btnStyle.textContent = "Style: Modern";
  }
  btnStyle?.addEventListener("click", () => {
    const modern = document.body.classList.toggle("theme-modern");
    localStorage.setItem("ui_style", modern ? "modern" : "classic");
    if (btnStyle) btnStyle.textContent = "Style: " + (modern ? "Modern" : "Classic");
  });

  /* =========================
   * [3] CHIPS (intro/rules/forum/feedback)
   * ========================= */
  const chips = document.querySelectorAll(".chip");
  const SECTIONS = {
    intro: `<h2>NiNi — Funny</h2>
      <p>Bạn có nghĩ việc học tiếng Anh là một thử thách khó nhằn và đầy áp lực không? Hãy quên đi cách học truyền thống và khám phá một thế giới hoàn toàn mới với <strong>NiNi — Funny</strong>!</p>
      <p>Với slogan "Chơi mê ly, bứt phá tư duy", NiNi-Funny không chỉ là một trò chơi giải trí, mà còn là công cụ giúp bạn:</p>
      <ul>
        <li>Đắm chìm vào cuộc phiêu lưu rực rỡ màu sắc.</li>
        <li>Học mà như chơi qua mini-game sáng tạo.</li>
        <li>Phát triển tư duy và kỹ năng giải quyết vấn đề.</li>
      </ul>
      <p>Hãy tải <strong>NiNi — Funny</strong> ngay hôm nay và bắt đầu hành trình.</p>`,
    rules: `<h2>Luật chơi</h2><p>Mỗi mini game có hướng dẫn ngắn ngay trước khi bắt đầu. Chơi vui, công bằng và tôn trọng bạn chơi.</p>`,
    forum: `<h2>Diễn đàn</h2><p>Góc khoe thành tích, trao đổi mẹo, đặt câu hỏi.</p>`,
    feedback:`<h2>Góp ý</h2><p>Hòm thư góp ý: suport@nini-funny.com</p>`
  };
  chips.forEach(ch => {
    ch.addEventListener("click", () => {
      chips.forEach(c => c.classList.toggle("is-active", c === ch));
      if (content) content.innerHTML = SECTIONS[ch.dataset.section] || SECTIONS.intro;
    });
  });

  /* =========================
   * [4] AUTH MODAL (giữ nguyên nếu có)
   * ========================= */
  const authBtn   = document.getElementById("authBtn");
  const authModal = document.getElementById("authModal");
  const closeEls  = authModal?.querySelectorAll("[data-close]") || [];
  const tabLines  = authModal?.querySelectorAll("#authTabs .tab-line") || [];
  const panes     = authModal?.querySelectorAll(".form") || [];

  function openAuth(which = "login") {
    authModal?.setAttribute("aria-hidden", "false");
    switchAuth(which);
  }
  function closeAuth() {
    authModal?.setAttribute("aria-hidden", "true");
  }
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

  /* =========================
   * [5] BOOT + PRELOAD BACKGROUNDS
   * ========================= */
  bootSeasonFromHash();
  window.addEventListener("hashchange", bootSeasonFromHash);
  Object.values(IMAGES).forEach(src => { const i = new Image(); i.src = src; });

  /* ==========================================================
   * [6] KỆ SÁCH TRONG KHUNG (SPRING)
   * ========================================================== */

  // NOTE: thử nhiều đường dẫn để tránh lỗi /public khi deploy tĩnh
  const LIB_CANDIDATES = [
    "/public/content/storybook/library-manifest.json",
    "/content/storybook/library-manifest.json",
    "content/storybook/library-manifest.json"
  ];
  const BOOK_CANDIDATES = (id) => [
    `/public/content/storybook/${id}.json`,
    `/content/storybook/${id}.json`,
    `content/storybook/${id}.json`
  ];

  async function fetchJSON(url){
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} - ${url}`);
    return res.json();
  }
  async function fetchFirstAvailable(urls){
    let lastErr;
    for (const u of urls){
      try { return await fetchJSON(u); }
      catch(e){ lastErr = e; }
    }
    throw lastErr || new Error("No URL worked");
  }

  async function loadLibrary(){
    try{
      const lib = await fetchFirstAvailable(LIB_CANDIDATES);
      if(!Array.isArray(lib.books)) throw new Error("library.books missing");
      return lib.books;
    }catch(err){
      console.warn("Library load failed:", err);
      return null;
    }
  }

  function renderShelfInFrame(books){
    if (!shelfMount) return;

    if (!books || !books.length){
      shelfMount.innerHTML = `
        <h3>Kệ sách</h3>
        <p class="muted">Chưa có sách. Đặt <code>/public/content/storybook/library-manifest.json</code>
        và các file <code>/public/content/storybook/&lt;ID&gt;.json</code>.</p>`;
      return;
    }

    const html = books.map(b=>`
      <article class="book-card" data-book="${b.id}">
        <img class="book-card__cover" src="${b.cover || '/public/assets/bg/nini_home.webp'}"
             alt="${b.title_vi || b.title_en || b.id}">
        <div class="book-card__body">
          <h4 class="book-card__title">${b.title_vi || b.title_en || b.id}</h4>
          <p class="book-card__meta">${b.author ? `Tác giả: ${b.author}` : ''}</p>
        </div>
      </article>
    `).join("");
    shelfMount.innerHTML = `<h3>Kệ sách</h3><div class="shelf-grid compact">${html}</div>`;

    shelfMount.querySelectorAll(".book-card").forEach(card=>{
      card.addEventListener("click", ()=> openReader(card.dataset.book));
    });
  }

  /* ==========================================================
   * [7] READER — CALENDAR VIEW + LANGUAGE + EFFECTS
   * ========================================================== */

  // --- Elements ---
  const readerModal   = document.getElementById("readerModal");
  const readerTitleEl = document.getElementById("readerBookTitle");

  const calendarView = document.getElementById("calendarView");
  const calendarBg   = document.getElementById("calendarBg");
  const subtitleBubble = document.getElementById("subtitleBubble"); // phụ đề đè ảnh

  const panelRight   = document.getElementById("panelRight");
  const readerTextVi = document.getElementById("readerTextVi");
  const readerTextEn = document.getElementById("readerTextEn");

  const pageInfo     = document.getElementById("readerPageInfo");
  const btnPrev      = document.getElementById("btnPrevPage");
  const btnNext      = document.getElementById("btnNextPage");

  // language toggle buttons (đặt trong header modal)
  const langViBtn = document.getElementById("langVi");
  const langEnBtn = document.getElementById("langEn");

  // speak buttons
  const btnSpeakVi  = document.getElementById("btnSpeakVi");
  const btnSpeakEn  = document.getElementById("btnSpeakEn");

  // State
  let currentBook = null;
  let pageIdx = 0;

  const audioVi = new Audio();
  const audioEn = new Audio();

  // Layout mode: chỉ dùng panel phải (calendar-right). Nếu sau này bạn có panel bottom, thêm mode ở đây.
  let readerMode = "right"; // giữ để tương thích API cũ

  // Language: 'vi' | 'en'  (đọc VI => phụ đề EN; đọc EN => phụ đề VI)
  let readerLang = localStorage.getItem("reader_lang") || "vi";

  // ===== Helper URL/Preload =====
  function absUrl(raw){
    if (!raw) return "";
    return raw.startsWith("http") ? raw : new URL(raw, location.origin).href;
  }
  function preloadBookImages(book){
    if (!book?.pages) return;
    book._imgPromises = book.pages.map(p=>{
      if (!p.image) return Promise.resolve();
      const u = absUrl(p.image);
      const img = new Image();
      img.src = u;
      return img.decode().catch(()=>{});
    });
  }
  async function setCalendarBg(url){
    const u = absUrl(url);
    if (!u) { calendarBg.style.backgroundImage = "none"; return; }
    try{
      const img = new Image(); img.src = u;
      await img.decode();
      calendarBg.style.backgroundImage = `url("${u}")`;
    }catch{
      // fallback: vẫn set, dù chưa decode
      calendarBg.style.backgroundImage = `url("${u}")`;
    }
  }

  // ===== Modal show/hide =====
  function showReader(show){
    readerModal?.setAttribute("aria-hidden", show ? "false" : "true");
    if (!show) { audioVi.pause(); audioEn.pause(); }
  }
  readerModal?.querySelectorAll("[data-reader-close]")?.forEach(el=>{
    el.addEventListener("click", ()=> showReader(false));
  });

  // ===== Language apply =====
  function applyReaderLang(lang){
    readerLang = (lang === "en") ? "en" : "vi";
    localStorage.setItem("reader_lang", readerLang);

    langViBtn?.classList.toggle("active", readerLang === "vi");
    langEnBtn?.classList.toggle("active", readerLang === "en");

    // Nút loa: chỉ show cái cùng ngôn ngữ
    btnSpeakVi?.classList.toggle("reader-hide", readerLang !== "vi");
    btnSpeakEn?.classList.toggle("reader-hide", readerLang !== "en");

    // Nếu đang phát, chuyển audio tương ứng
    if (readerLang === "vi"){
      if (!audioVi.paused){ audioEn.pause(); audioVi.play().catch(()=>{}); }
      else { audioEn.pause(); }
    } else {
      if (!audioEn.paused){ audioVi.pause(); audioEn.play().catch(()=>{}); }
      else { audioVi.pause(); }
    }

    updateSubtitleOverlay();
  }
  langViBtn?.addEventListener("click", ()=> applyReaderLang("vi"));
  langEnBtn?.addEventListener("click", ()=> applyReaderLang("en"));

  // ===== Subtitle overlay (ngôn ngữ đối ứng) =====
  function updateSubtitleOverlay(){
    if (!subtitleBubble || !currentBook) return;
    const p = currentBook.pages[pageIdx] || {};
    const subtitle = (readerLang === "vi") ? (p.text_en || "") : (p.text_vi || "");
    if (subtitle && subtitle.trim()){
      subtitleBubble.textContent = subtitle;
      subtitleBubble.style.display = "block";
    } else {
      subtitleBubble.textContent = "";
      subtitleBubble.style.display = "none";
    }
  }

  // ===== Flip effect =====
  function flipTo(next){
    if(!calendarBg) { next(); return; }
    calendarBg.classList.remove("flip-in","flip-out");
    calendarBg.classList.add("flip-out");
    setTimeout(()=>{
      next();
      calendarBg.classList.remove("flip-out");
      calendarBg.classList.add("flip-in");
      setTimeout(()=> calendarBg.classList.remove("flip-in"), 340);
    }, 160);
  }

  // ===== Render trang =====
  function renderPage(){
    if(!currentBook) return;
    const total = currentBook.pages.length || 0;
    const p = currentBook.pages[pageIdx] || {};

    // ảnh nền (full-bleed)
    setCalendarBg(p.image || currentBook.cover || "");

    // text cho panel phải (đặt đủ 2 ngôn ngữ, overlay sẽ chọn ngôn ngữ đối ứng)
    if (readerTextVi) readerTextVi.textContent = p.text_vi || "";
    if (readerTextEn) readerTextEn.textContent = p.text_en || "";

    // audio nguồn
    audioVi.pause(); audioEn.pause();
    audioVi.src = p.sound_vi || "";
    audioEn.src = p.sound_en || "";

    // enable/disable nút loa
    btnSpeakVi && (btnSpeakVi.disabled = !p.sound_vi);
    btnSpeakEn && (btnSpeakEn.disabled = !p.sound_en);

    // info & nav
    const info = `Trang ${Math.min(pageIdx+1,total)}/${total || 1}`;
    pageInfo && (pageInfo.textContent = info);
    btnPrev && (btnPrev.disabled = pageIdx<=0);
    btnNext && (btnNext.disabled = pageIdx>=total-1);

    // ngôn ngữ & phụ đề overlay
    applyReaderLang(readerLang);
  }

  btnPrev?.addEventListener("click", ()=>{ if(pageIdx>0){ flipTo(()=>{ pageIdx--; renderPage(); }); }});
  btnNext?.addEventListener("click", ()=>{ if(currentBook && pageIdx<currentBook.pages.length-1){ flipTo(()=>{ pageIdx++; renderPage(); }); }});

  function stopOthers(who){
    if (who === 'vi'){ audioEn.pause(); audioEn.currentTime = 0; }
    if (who === 'en'){ audioVi.pause(); audioVi.currentTime = 0; }
  }
  function playByLang(){
    if (readerLang === "vi"){
      if (!audioVi.src) return;
      if (audioVi.paused){ stopOthers('vi'); audioVi.play(); }
      else { audioVi.pause(); }
    } else {
      if (!audioEn.src) return;
      if (audioEn.paused){ stopOthers('en'); audioEn.play(); }
      else { audioEn.pause(); }
    }
  }
  btnSpeakVi?.addEventListener("click", playByLang);
  btnSpeakEn?.addEventListener("click", playByLang);

  // ===== Mở sách =====
  async function openReader(bookId){
    try{
      const book = await fetchFirstAvailable(BOOK_CANDIDATES(bookId));
      currentBook = {
        id: book.id || book.IDBook || bookId,
        title_vi: book.title_vi || book.little_vi || "",
        title_en: book.title_en || book.little_en || "",
        cover:    book.cover || book.L_imageBia || "",
        pages: Array.isArray(book.pages) ? book.pages.map(p=>({
          id: p.id || p.IDPage || "",
          text_vi: p.text_vi || p.noidung_vi || "",
          text_en: p.text_en || p.noidung_en || "",
          image:   p.image || p.L_image_P || "",
          sound_vi:p.sound_vi || p.L_sound_vi || "",
          sound_en:p.sound_en || p.L_sound_en || ""
        })) : []
      };

      if (readerTitleEl) {
        readerTitleEl.textContent = currentBook.title_vi || currentBook.title_en || currentBook.id;
      }

      // Preload ảnh trang để chuyển mượt
      preloadBookImages(currentBook);

      pageIdx = 0;
      renderPage();
      showReader(true);
    }catch(err){
      alert("Không mở được sách " + bookId + ": " + err.message);
    }
  }
})(); // END IIFE
