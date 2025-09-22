/* NiNi — App JS */
(() => {
  // ====== CONSTANTS ======
  const IMAGES = {
    home:  "/public/assets/bg/nini_home.webp",
    spring:"/public/assets/images/seasons/spring.webp",
    summer:"/public/assets/images/seasons/summer.webp",
    autumn:"/public/assets/images/seasons/autumn.webp",
    winter:"/public/assets/images/seasons/winter.webp",
  };

  const MANIFEST_URL = "/public/content/storybook/library-manifest.json";

  const tabs    = document.querySelectorAll("#seasonTabs .tab");
  const frame   = document.getElementById("frame");
  const content = document.getElementById("content");

  /* ================= SEASON ================= */
  function setSeason(season) {
    const img = IMAGES[season] || IMAGES.home;
    document.documentElement.style.setProperty("--bg-url", `url("${img}")`);
    frame.style.backgroundImage = `url("${img}")`;
    tabs.forEach(b => b.classList.toggle("is-active", b.dataset.season === season));

    const newHash = `#/${season}`;
    if (location.hash !== newHash) {
      history.replaceState({}, "", newHash);
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }

    // kệ sách chỉ hiển thị ở spring (bạn muốn để trong frame có hoa rơi)
    const shelfMount = document.getElementById("shelfMount");
    if (season === "spring") {
      shelfMount.hidden = false;
      renderShelf();
    } else {
      shelfMount.hidden = true;
      shelfMount.innerHTML = "";
    }
  }

  function bootSeasonFromHash() {
    const raw = (location.hash || "").replace(/^#\/?/, "");
    const s = (raw || "home").toLowerCase();
    setSeason(IMAGES[s] ? s : "home");
  }

  tabs.forEach(btn => btn.addEventListener("click", () => setSeason(btn.dataset.season)));

  /* ================= SECTIONS ================= */
  const chips = document.querySelectorAll(".chip");
  const SECTIONS = {
    intro: `<h2>NiNi — Funny</h2>
      <p>...</p>`,
    rules: `<h2>Luật chơi</h2><p>...</p>`,
    forum: `<h2>Diễn đàn</h2><p>...</p>`,
    feedback:`<h2>Góp ý</h2><p>...</p>`
  };
  chips.forEach(ch => {
    ch.addEventListener("click", () => {
      chips.forEach(c => c.classList.toggle("is-active", c === ch));
      content.innerHTML = SECTIONS[ch.dataset.section] || SECTIONS.intro;
    });
  });

  /* ================= AUTH MODAL ================= */
  const authBtn   = document.getElementById("authBtn");
  const authModal = document.getElementById("authModal");
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

  /* ================== SHELF ================== */
  let LIB = null; // manifest cache

  async function fetchJSON(url){
    const res = await fetch(url, {cache:"no-store"});
    if(!res.ok) throw new Error(res.status + " " + url);
    return res.json();
  }

  async function ensureManifest(){
    if (LIB) return LIB;
    try{
      LIB = await fetchJSON(MANIFEST_URL);
    }catch(e){
      console.warn("Manifest error:", e);
      LIB = {version:0, books:[]};
    }
    return LIB;
  }

  async function renderShelf(){
    await ensureManifest();
    const mount = document.getElementById("shelfMount");
    const books = (LIB && LIB.books) || [];
    if (!books.length){
      mount.innerHTML = `<div class="shelf">
        <h3 class="shelf__title">Kệ sách</h3>
        <p class="muted">Chưa có sách. Đặt <code>/public/content/storybook/library-manifest.json</code> và các file <code>/public/content/storybook/&lt;ID&gt;.json</code>.</p>
      </div>`;
      return;
    }
    const html = books.map(b => `
      <article class="book-card" data-book="${b.id}">
        <img class="book-card__cover" src="${b.cover || '/public/assets/bg/nini_home.webp'}" alt="${b.title_vi || b.title_en || b.id}">
        <div class="book-card__body">
          <h4 class="book-card__title">${b.title_vi || b.title_en || b.id}</h4>
          <div class="book-card__meta">${b.author ? 'Tác giả: '+b.author : ''}</div>
        </div>
      </article>
    `).join("");
    mount.innerHTML = `<div class="shelf"><h3 class="shelf__title">Kệ sách</h3><div class="shelf__grid">${html}</div></div>`;
    mount.querySelectorAll(".book-card").forEach(card=>{
      card.addEventListener("click", ()=> openReader(card.dataset.book));
    });
  }

  /* ================== READER ================== */
  const readerModal = document.getElementById("readerModal");
  const readerTitle = document.getElementById("readerTitle");
  const readerImg   = document.getElementById("readerImage");
  const subtitleEl  = document.getElementById("subtitleBubble");
  const btnPrev     = document.getElementById("btnPrevPage");
  const btnNext     = document.getElementById("btnNextPage");
  const infoEl      = document.getElementById("readerPageInfo");
  const btnVI       = document.getElementById("langVi");
  const btnEN       = document.getElementById("langEn");
  const btnSpeak    = document.getElementById("btnSpeak");

  let currentBook = null;
  let pageIdx = 0;
  let lang = localStorage.getItem("reader_lang") || "vi"; // 'vi' | 'en'

  function setLang(newLang){
    lang = newLang;
    localStorage.setItem("reader_lang", lang);
    btnVI.classList.toggle("is-active", lang==="vi");
    btnEN.classList.toggle("is-active", lang==="en");
    renderPage();
  }

  btnVI.addEventListener("click", ()=> setLang("vi"));
  btnEN.addEventListener("click", ()=> setLang("en"));

  // speech
  btnSpeak.addEventListener("click", ()=>{
    if(!currentBook) return;
    const p = currentBook.pages[pageIdx] || {};
    const text = (lang==="vi" ? p.text_vi : p.text_en) || "";
    if(!text) return;
    try{
      const u = new SpeechSynthesisUtterance(text);
      u.lang = (lang==="vi") ? "vi-VN" : "en-US";
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    }catch(e){ console.warn(e); }
  });

  // đóng mở reader
  function showReader(show){
    readerModal.setAttribute("aria-hidden", show ? "false" : "true");
    if(!show){
      try{ speechSynthesis.cancel(); }catch(_){}
    }
  }
  readerModal.querySelectorAll("[data-reader-close]").forEach(el=>{
    el.addEventListener("click", ()=> showReader(false));
  });
  readerModal.addEventListener("click", e=>{
    if(e.target === readerModal || e.target.classList.contains("modal__backdrop")){
      showReader(false);
    }
  });

  btnPrev.addEventListener("click", ()=>{
    if(!currentBook) return;
    if(pageIdx>0){ pageIdx--; renderPage(); }
  });
  btnNext.addEventListener("click", ()=>{
    if(!currentBook) return;
    if(pageIdx < currentBook.pages.length-1){ pageIdx++; renderPage(); }
  });

  async function openReader(bookId){
    try{
      const book = await fetchJSON(`/public/content/storybook/${bookId}.json`);
      currentBook = book;
      pageIdx = 0;
      readerTitle.textContent = book.title_vi || book.title_en || bookId;
      setLang(lang); // giữ ngôn ngữ đang chọn
      showReader(true);
    }catch(e){
      alert("Không tải được sách: " + e.message);
    }
  }

  function renderPage(){
    if(!currentBook) return;
    const total = currentBook.pages.length || 0;
    const p = currentBook.pages[pageIdx] || {};

    // Ảnh minh hoạ (16:9 cover)
    const imgUrl = p.image || currentBook.cover || "/public/assets/bg/nini_home.webp";
    readerImg.src = imgUrl;

    // Subtitle một ngôn ngữ
    const text = (lang==="vi" ? p.text_vi : p.text_en) || "";
    subtitleEl.textContent = text;

    // Nav + trạng thái
    infoEl.textContent = `Trang ${Math.min(pageIdx+1, total)}/${total || 1}`;
    btnPrev.disabled = (pageIdx<=0);
    btnNext.disabled = (pageIdx>=total-1);
  }

  /* ================= START ================= */
  bootSeasonFromHash();
  window.addEventListener("hashchange", bootSeasonFromHash);
  Object.values(IMAGES).forEach(src => { const i = new Image(); i.src = src; });
})();
