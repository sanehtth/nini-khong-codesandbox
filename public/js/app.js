/* ============================================================
 * NiNi — App JS (seasons + shelf-in-frame + calendar reader)
 * Tác vụ chính:
 *  - Router theo #/<season>, đổi nền
 *  - Kệ sách trong khung (tab Spring) đọc từ library-manifest.json
 *  - Reader "lịch để bàn": ảnh phủ toàn khung + panel kính mờ PHẢI / DƯỚI
 *  - Nút chọn ngôn ngữ VI/EN: giọng đọc theo lựa chọn, phụ đề là ngôn ngữ đối ứng
 *  - Hiệu ứng lật trang + auto-scroll karaoke
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
  const shelfMount = document.getElementById("shelfMount"); // mount kệ trong khung

  // Đổi mùa + nền + hiển thị kệ
  function setSeason(season) {
    const img = IMAGES[season] || IMAGES.home;

    // nền ngoài khung
    document.documentElement.style.setProperty("--bg-url", `url("${img}")`);
    // nền trong khung
    if (frame) frame.style.backgroundImage = `url("${img}")`;

    // tab active
    tabs.forEach(b => b.classList.toggle("is-active", b.dataset.season === season));

    // hash router (chuẩn hóa #/season)
    const newHash = `#/${season}`;
    if (location.hash !== newHash) {
      history.replaceState({}, "", newHash);
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }

    // Kệ sách tại Spring
    if (season === "spring") {
      if (shelfMount) shelfMount.hidden = false;
      loadLibrary().then(renderShelfInFrame);
    } else {
      if (shelfMount) { shelfMount.hidden = true; shelfMount.innerHTML = ""; }
      if (content) content.innerHTML = SECTIONS.intro;
    }
  }

  // Lấy mùa từ hash khi nạp trang / đổi hash
  function bootSeasonFromHash() {
    const raw = (location.hash || "").replace(/^#\/?/, "");
    const s = (raw || "home").toLowerCase();
    setSeason(IMAGES[s] ? s : "home");
  }

  tabs.forEach(btn => btn.addEventListener("click", () => setSeason(btn.dataset.season)));

  /* =========================
   * [2] STYLE TOGGLER
   * ========================= */
  const btnStyle = document.getElementById("toggleStyle");
  const savedStyle = localStorage.getItem("ui_style"); // 'modern' | 'classic'
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
   * [3] CHIPS SECTIONS
   * ========================= */
  const chips = document.querySelectorAll(".chip");
  const SECTIONS = {
    intro: `<h2>NiNi — Funny</h2>
      <p>Bạn có nghĩ việc học tiếng Anh là một thử thách khó nhằn và đầy áp lực không? Hãy quên đi cách học truyền thống và khám phá một thế giới hoàn toàn mới với <strong>NiNi — Funny</strong>!</p>
      <p>Với slogan "Chơi mê ly, bứt phá tư duy", NiNi-Funny không chỉ là một trò chơi giải trí, mà còn là công cụ giúp bạn:</p>
      <ul>
        <li>Đắm chìm vào cuộc phiêu lưu...</li>
        <li>Học mà như chơi...</li>
        <li>Phát triển bản thân...</li>
      </ul>
      <p>Hãy tải <strong>NiNi — Funny</strong> ngay hôm nay và bắt đầu hành trình.</p>`,
    rules: `<h2>Luật chơi</h2><p>Mỗi mini game có hướng dẫn ngắn ngay trước khi bắt đầu...</p>`,
    forum: `<h2>Diễn đàn</h2><p>Góc khoe thành tích, trao đổi mẹo, đặt câu hỏi.</p>`,
    feedback:`<h2>Góp ý</h2><p>Góp ý để NiNi tốt hơn: suport@nini-funny.com</p>`
  };
  chips.forEach(ch => {
    ch.addEventListener("click", () => {
      chips.forEach(c => c.classList.toggle("is-active", c === ch));
      if (content) content.innerHTML = SECTIONS[ch.dataset.section] || SECTIONS.intro;
    });
  });

  /* =========================
   * [4] AUTH MODAL
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
   * [5] BOOT + PRELOAD
   * ========================= */
  bootSeasonFromHash();
  window.addEventListener("hashchange", bootSeasonFromHash);
  Object.values(IMAGES).forEach(src => { const i = new Image(); i.src = src; });

  /* ==========================================================
   * [6] KỆ SÁCH TRONG KHUNG (SPRING)
   * ========================================================== */
  const LIBRARY_URL = "/public/content/storybook/library-manifest.json";
  const BOOK_URL = (id) => `/public/content/storybook/${id}.json`;

  // fetch JSON helper (no-cache để luôn thấy nội dung mới)
  async function fetchJSON(url){
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} - ${url}`);
    return res.json();
  }

  // Tải manifest: trả về mảng books hoặc null nếu lỗi
  async function loadLibrary(){
    try{
      const lib = await fetchJSON(LIBRARY_URL);
      if(!Array.isArray(lib.books)) throw new Error("library.books missing");
      return lib.books;
    }catch(err){
      console.warn("Library load failed:", err);
      return null;
    }
  }

  // Render kệ vào #shelfMount (trong .frame)
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
   * [7] READER — "LỊCH ĐỂ BÀN" + NGÔN NGỮ + KARAOKE
   * ========================================================== */
  // --- Elements chính ---
  const readerModal   = document.getElementById("readerModal");
  const readerTitleEl = document.getElementById("readerBookTitle");

  // Calendar view + background ảnh
  const calendarView = document.getElementById("calendarView");
  const calendarBg   = document.getElementById("calendarBg");

  // Panel phải & panel dưới (karaoke)
  const panelRight   = document.getElementById("panelRight");
  const panelBottom  = document.getElementById("panelBottom");

  // Text trong panel phải
  const readerTextVi = document.getElementById("readerTextVi");
  const readerTextEn = document.getElementById("readerTextEn");
  // Text trong panel dưới (karaoke)
  const readerTextViK = document.getElementById("readerTextViK");
  const readerTextEnK = document.getElementById("readerTextEnK");

  // Thông tin trang
  const pageInfo  = document.getElementById("readerPageInfo");
  const pageInfo2 = document.getElementById("readerPageInfo2");

  // Nút điều hướng (cả 2 panel)
  const btnPrev = document.getElementById("btnPrevPage");
  const btnNext = document.getElementById("btnNextPage");
  const btnPrev2 = document.getElementById("btnPrevPage2");
  const btnNext2 = document.getElementById("btnNextPage2");

  // Nút chọn layout (nếu có)
  const modeRightBtn  = document.getElementById("modeRight");
  const modeBottomBtn = document.getElementById("modeBottom");

  // Nút chọn ngôn ngữ
  const langViBtn = document.getElementById("langVi");
  const langEnBtn = document.getElementById("langEn");

  // Nút loa (2 nơi)
  const btnSpeakVi  = document.getElementById("btnSpeakVi");
  const btnSpeakEn  = document.getElementById("btnSpeakEn");
  const btnSpeakVi2 = document.getElementById("btnSpeakVi2");
  const btnSpeakEn2 = document.getElementById("btnSpeakEn2");

  // Phụ đề overlay trên ảnh
  const subtitleBubble = document.getElementById("subtitleBubble");

  // Trạng thái Reader
  let currentBook = null;
  let pageIdx = 0;

  // Audio objects (không dùng <audio> controls)
  const audioVi = new Audio();
  const audioEn = new Audio();

  // Layout: 'right' | 'bottom'
  let readerMode = localStorage.getItem("reader_mode") || "right";
  function applyReaderMode(mode){
    readerMode = (mode === "bottom") ? "bottom" : "right";
    localStorage.setItem("reader_mode", readerMode);
    if (calendarView){
      calendarView.classList.toggle("mode-right",  readerMode === "right");
      calendarView.classList.toggle("mode-bottom", readerMode === "bottom");
    }
  }
  modeRightBtn?.addEventListener("click", ()=> applyReaderMode("right"));
  modeBottomBtn?.addEventListener("click", ()=> applyReaderMode("bottom"));

  // Ngôn ngữ đọc: 'vi' | 'en'  (đọc VI => phụ đề EN; đọc EN => phụ đề VI)
  let readerLang = localStorage.getItem("reader_lang") || "vi";
  function applyReaderLang(lang){
    readerLang = (lang === "en") ? "en" : "vi";
    localStorage.setItem("reader_lang", readerLang);

    // Hiệu ứng active cho nút chọn ngữ
    langViBtn?.classList.toggle("active", readerLang === "vi");
    langEnBtn?.classList.toggle("active", readerLang === "en");

    // Ẩn/hiện các block text trong panel (để giao diện gọn)
    const viBlocks = [readerTextVi, readerTextViK].filter(Boolean);
    const enBlocks = [readerTextEn, readerTextEnK].filter(Boolean);
    if (readerLang === "vi"){ // đọc VI => show EN (phụ đề)
      viBlocks.forEach(el => el?.classList.add("reader-hide"));
      enBlocks.forEach(el => el?.classList.remove("reader-hide"));
    } else {                  // đọc EN => show VI (phụ đề)
      enBlocks.forEach(el => el?.classList.add("reader-hide"));
      viBlocks.forEach(el => el?.classList.remove("reader-hide"));
    }

    // Nút loa: chỉ hiện nhóm tương ứng
    [btnSpeakVi, btnSpeakVi2].forEach(b=> b?.classList.toggle("reader-hide", readerLang !== "vi"));
    [btnSpeakEn, btnSpeakEn2].forEach(b=> b?.classList.toggle("reader-hide", readerLang !== "en"));

    // Nếu đang phát, chuyển audio đúng ngữ
    if (readerLang === "vi"){
      if (!audioVi.paused){ audioEn.pause(); audioVi.play().catch(()=>{}); }
      else { audioEn.pause(); }
    } else {
      if (!audioEn.paused){ audioVi.pause(); audioEn.play().catch(()=>{}); }
      else { audioVi.pause(); }
    }

    updateSubtitleOverlay(); // phụ đề overlay trên ảnh
  }
  langViBtn?.addEventListener("click", ()=> applyReaderLang("vi"));
  langEnBtn?.addEventListener("click", ()=> applyReaderLang("en"));

  // Mở/đóng modal reader
  function showReader(show){
    readerModal?.setAttribute("aria-hidden", show ? "false" : "true");
    if (!show) { audioVi.pause(); audioEn.pause(); }
  }
  readerModal?.querySelectorAll("[data-reader-close]")?.forEach(el=>{
    el.addEventListener("click", ()=> showReader(false));
  });

  // Cập nhật phụ đề overlay (ngôn ngữ đối ứng)
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

  // Hiệu ứng lật: flip từ dưới lên
  function flipTo(next){
    if(!calendarBg) { next(); return; }
    calendarBg.classList.remove("flip-in","flip-out");
    calendarBg.classList.add("flip-out");
    setTimeout(()=>{
      next(); // đổi nội dung trang ở giữa hiệu ứng
      calendarBg.classList.remove("flip-out");
      calendarBg.classList.add("flip-in");
      setTimeout(()=> calendarBg.classList.remove("flip-in"), 340);
    }, 160);
  }

  // Auto-scroll karaoke khi phát audio (ước lượng theo duration)
  function autoScrollWhile(audio, box){
    if (!box) return;
    box.scrollTo({ top:0, behavior:"auto" });
    const dur = Math.max(1, audio.duration || 1);
    const max = box.scrollHeight - box.clientHeight;
    if (max <= 0) return;

    let rafId;
    const t0 = performance.now();
    function step(now){
      const elapse = (now - t0)/1000;
      const p = Math.min(1, elapse / dur);
      box.scrollTop = p * max;
      if (p < 1 && !audio.paused) rafId = requestAnimationFrame(step);
    }
    audio.addEventListener("pause", ()=> cancelAnimationFrame(rafId), { once:false });
    requestAnimationFrame(step);
  }

  // Render 1 trang: ảnh nền + text + audio + info
  function renderPage(){
    if(!currentBook) return;
    const total = currentBook.pages.length || 0;
    const p = currentBook.pages[pageIdx] || {};

    // Ảnh nền phủ toàn khung
    if (calendarBg){
      const raw = p.image || currentBook.cover || "";
      const url = raw ? (raw.startsWith("http") ? raw : new URL(raw, location.origin).href) : "";
      calendarBg.style.backgroundImage = url ? `url("${url}")` : "none";
    }

    // Set text cho cả hai khu (để applyReaderLang ẩn/hiện phù hợp)
    if (readerTextVi)  readerTextVi.textContent  = p.text_vi || "";
    if (readerTextEn)  readerTextEn.textContent  = p.text_en || "";
    if (readerTextViK) readerTextViK.textContent = p.text_vi || "";
    if (readerTextEnK) readerTextEnK.textContent = p.text_en || "";

    // Audio nguồn
    audioVi.pause(); audioEn.pause();
    audioVi.src = p.sound_vi || "";
    audioEn.src = p.sound_en || "";

    // Enable/disable nút loa theo nguồn
    const canVi = !!p.sound_vi, canEn = !!p.sound_en;
    [btnSpeakVi, btnSpeakVi2].forEach(b => b && (b.disabled = !canVi));
    [btnSpeakEn, btnSpeakEn2].forEach(b => b && (b.disabled = !canEn));

    // Info + prev/next cho cả 2 panel
    const info = `Trang ${Math.min(pageIdx+1,total)}/${total || 1}`;
    pageInfo  && (pageInfo.textContent  = info);
    pageInfo2 && (pageInfo2.textContent = info);
    [btnPrev, btnPrev2].forEach(b => b && (b.disabled = pageIdx<=0));
    [btnNext, btnNext2].forEach(b => b && (b.disabled = pageIdx>=total-1));

    // Áp dụng ngôn ngữ (ẩn/hiện block + phụ đề overlay)
    applyReaderLang(readerLang);

    // Reset karaoke scroll
    if (readerTextViK) readerTextViK.scrollTop = 0;
    if (readerTextEnK) readerTextEnK.scrollTop = 0;
  }

  // Điều hướng trang (có hiệu ứng flip)
  btnPrev?.addEventListener("click", ()=>{ if(pageIdx>0){ flipTo(()=>{ pageIdx--; renderPage(); }); }});
  btnNext?.addEventListener("click", ()=>{ if(currentBook && pageIdx<currentBook.pages.length-1){ flipTo(()=>{ pageIdx++; renderPage(); }); }});
  btnPrev2?.addEventListener("click", ()=>{ if(pageIdx>0){ flipTo(()=>{ pageIdx--; renderPage(); }); }});
  btnNext2?.addEventListener("click", ()=>{ if(currentBook && pageIdx<currentBook.pages.length-1){ flipTo(()=>{ pageIdx++; renderPage(); }); }});

  // Chỉ cho một audio phát mỗi lần
  function stopOthers(who){
    if (who === 'vi'){ audioEn.pause(); audioEn.currentTime = 0; }
    if (who === 'en'){ audioVi.pause(); audioVi.currentTime = 0; }
  }

  // Phát theo ngôn ngữ đã chọn (đồng thời auto-scroll karaoke nếu ở mode bottom)
  function playByLang(){
    if (readerLang === "vi"){
      if (!audioVi.src) return;
      if (audioVi.paused){ stopOthers('vi'); audioVi.play(); if(readerMode==="bottom") autoScrollWhile(audioVi, readerTextViK); }
      else { audioVi.pause(); }
    } else {
      if (!audioEn.src) return;
      if (audioEn.paused){ stopOthers('en'); audioEn.play(); if(readerMode==="bottom") autoScrollWhile(audioEn, readerTextEnK); }
      else { audioEn.pause(); }
    }
  }
  [btnSpeakVi, btnSpeakEn, btnSpeakVi2, btnSpeakEn2].forEach(b => b?.addEventListener("click", playByLang));

  // Mở sách: chuẩn hoá field, áp dụng layout/lang, render trang đầu
  async function openReader(bookId){
    try{
      const book = await fetchJSON(BOOK_URL(bookId));
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

      pageIdx = 0;
      renderPage();
      applyReaderMode(readerMode);   // panel phải / panel dưới
      applyReaderLang(readerLang);   // ngôn ngữ đọc & phụ đề
      showReader(true);
    }catch(err){
      alert("Không mở được sách " + bookId + ": " + err.message);
    }
  }
})(); // <— kết thúc IIFE (đảm bảo đủ dấu )
