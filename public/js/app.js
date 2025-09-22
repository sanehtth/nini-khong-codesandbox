/* NiNi — App JS (seasons + shelf-in-frame + 2-page reader) */
(() => {
  /* =========================
   * 1) SEASONS / ROUTER
   * ========================= */
  const IMAGES = {
    home:  "/public/assets/bg/nini_home.webp",
    spring:"/public/assets/images/seasons/spring.webp",
    summer:"/public/assets/images/seasons/summer.webp",
    autumn:"/public/assets/images/seasons/autumn.webp",
    winter:"/public/assets/images/seasons/winter.webp",
  };

  const tabs    = document.querySelectorAll("#seasonTabs .tab");
  const frame   = document.getElementById("frame");
  const content = document.getElementById("content");
  const shelfMount = document.getElementById("shelfMount"); // kệ trong khung (đã thêm vào index.html)

  function setSeason(season) {
    const img = IMAGES[season] || IMAGES.home;

    // nền ngoài khung
    document.documentElement.style.setProperty("--bg-url", `url("${img}")`);
    // nền trong khung
    if (frame) frame.style.backgroundImage = `url("${img}")`;

    // active tab
    tabs.forEach(b => b.classList.toggle("is-active", b.dataset.season === season));

    // hash router
    const newHash = `#/${season}`;
    if (location.hash !== newHash) {
      history.replaceState({}, "", newHash);
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }

    // Hiển thị kệ vào mùa Spring
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
   * 2) STYLE TOGGLER
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
   * 3) CHIPS SECTIONS
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
   * 4) AUTH MODAL
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
   * 5) BOOT + PRELOAD
   * ========================= */
  bootSeasonFromHash();
  window.addEventListener("hashchange", bootSeasonFromHash);
  Object.values(IMAGES).forEach(src => { const i = new Image(); i.src = src; });

  /* ==========================================================
   * 6) KỆ SÁCH TRONG KHUNG (SPRING)
   * ========================================================== */
  const LIBRARY_URL = "/public/content/storybook/library-manifest.json";
  const BOOK_URL = (id) => `/public/content/storybook/${id}.json`;

  async function fetchJSON(url){
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} - ${url}`);
    return res.json();
  }

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
    shelfMount.innerHTML = `<h3>Kệ sách</h3><div class="shelf-grid">${html}</div>`;

    shelfMount.querySelectorAll(".book-card").forEach(card=>{
      card.addEventListener("click", ()=> openReader(card.dataset.book));
    });
  }

  /* ==========================================================
   * 7) READER 2-TRANG (ảnh trái, VI/EN + 🔊 bên phải)
   *    — dùng modal HTML đã chèn trong index.html
   * ========================================================== */
  const readerModal   = document.getElementById("readerModal");
  const readerTitleEl = document.getElementById("readerBookTitle");
  const readerImg     = document.getElementById("readerImage");
  const readerTextVi  = document.getElementById("readerTextVi");
  const readerTextEn  = document.getElementById("readerTextEn");
  const pageInfo      = document.getElementById("readerPageInfo");
  const btnPrev       = document.getElementById("btnPrevPage");
  const btnNext       = document.getElementById("btnNextPage");
  const btnSpeakVi    = document.getElementById("btnSpeakVi");
  const btnSpeakEn    = document.getElementById("btnSpeakEn");

  // chỉ 1 khối reader duy nhất, không duplicate
  const audioVi = new Audio();
  const audioEn = new Audio();

  let currentBook = null;
  let pageIdx = 0;

  function showReader(show){
    readerModal?.setAttribute("aria-hidden", show ? "false" : "true");
    if (!show) { audioVi.pause(); audioEn.pause(); }
  }
  readerModal?.querySelectorAll("[data-reader-close]")?.forEach(el=>{
    el.addEventListener("click", ()=> showReader(false));
  });

  function renderPage(){
    if(!currentBook) return;
    const total = currentBook.pages.length || 0;
    const p = currentBook.pages[pageIdx] || {};

    if (readerImg)    readerImg.src = p.image || currentBook.cover || "";
    if (readerTextVi) readerTextVi.textContent = p.text_vi || "";
    if (readerTextEn) readerTextEn.textContent = p.text_en || "";

    audioVi.pause(); audioEn.pause();
    audioVi.src = p.sound_vi || "";
    audioEn.src = p.sound_en || "";

    if (btnSpeakVi) btnSpeakVi.disabled = !p.sound_vi;
    if (btnSpeakEn) btnSpeakEn.disabled = !p.sound_en;

    if (pageInfo) pageInfo.textContent = `Trang ${Math.min(pageIdx+1,total)}/${total || 1}`;
    if (btnPrev)  btnPrev.disabled = pageIdx<=0;
    if (btnNext)  btnNext.disabled = pageIdx>=total-1;
  }

  btnPrev?.addEventListener("click", ()=>{ if(pageIdx>0){ pageIdx--; renderPage(); }});
  btnNext?.addEventListener("click", ()=>{ if(currentBook && pageIdx<currentBook.pages.length-1){ pageIdx++; renderPage(); }});

  function stopOthers(who){
    if (who === 'vi'){ audioEn.pause(); audioEn.currentTime = 0; }
    if (who === 'en'){ audioVi.pause(); audioVi.currentTime = 0; }
  }
  btnSpeakVi?.addEventListener("click", ()=>{
    if (!audioVi.src) return;
    if (audioVi.paused){ stopOthers('vi'); audioVi.play(); }
    else { audioVi.pause(); }
  });
  btnSpeakEn?.addEventListener("click", ()=>{
    if (!audioEn.src) return;
    if (audioEn.paused){ stopOthers('en'); audioEn.play(); }
    else { audioEn.pause(); }
  });

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
      showReader(true);
    }catch(err){
      alert("Không mở được sách " + bookId + ": " + err.message);
    }
  }
})();  // <— KẾT THÚC IIFE: nhớ đủ dấu )
