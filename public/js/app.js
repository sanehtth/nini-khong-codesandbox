/* NiNi — App JS (đường dẫn tuyệt đối, file JS thuần) */
(() => {
  // ====== CONSTANTS ======
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
  const shelfEl = document.getElementById("shelfMount");

  // trạng thái reader
  let currentBook = null;    // dữ liệu sách hiện tại
  let pageIdx = 0;           // chỉ số trang
  let lang = "vi";           // VI/EN

  // ====== SET SEASON ======
  function setSeason(season) {
    const img = IMAGES[season] || IMAGES.home;

    // nền ngoài khung
    document.documentElement.style.setProperty("--bg-url", `url("${img}")`);
    // nền trong khung
    frame.style.backgroundImage = `url("${img}")`;

    // active tab
    tabs.forEach(b => b.classList.toggle("is-active", b.dataset.season === season));

    // hash router
    const newHash = `#/${season}`;
    if (location.hash !== newHash) {
      history.replaceState({}, "", newHash);
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }

    // Hiển thị kệ sách trong frame khi ở Spring
    if (season === "spring") {
      renderShelfInFrame();
    } else {
      shelfEl.hidden = true;
      shelfEl.innerHTML = "";
    }
  }

  // ====== INIT SEASON (từ hash) ======
  function bootSeasonFromHash() {
    const raw = (location.hash || "").replace(/^#\/?/, "");
    const s = (raw || "home").toLowerCase();
    setSeason(IMAGES[s] ? s : "home");
  }

  // ====== NAV EVENTS ======
  tabs.forEach(btn => {
    btn.addEventListener("click", () => setSeason(btn.dataset.season));
  });

  // ====== CHIPS (sections) ======
  const chips = document.querySelectorAll(".chip");
  const SECTIONS = {
    intro: `<h2>NiNi — Funny</h2>
      <p>Với slogan "Chơi mê ly, bứt phá tư duy", NiNi-Funny giúp bạn học mà như chơi…</p>`,
    rules: `<h2>Luật chơi</h2><p>Mỗi mini game có hướng dẫn ngắn…</p>`,
    forum: `<h2>Diễn đàn</h2><p>Góc để khoe thành tích…</p>`,
    feedback:`<h2>Góp ý</h2><p>Đóng góp ý tưởng trò chơi mới hoặc báo lỗi…</p>`
  };
  chips.forEach(ch => {
    ch.addEventListener("click", () => {
      chips.forEach(c => c.classList.toggle("is-active", c === ch));
      content.innerHTML = SECTIONS[ch.dataset.section] || SECTIONS.intro;
    });
  });

  // ====== AUTH MODAL ======
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

  // ====== KỆ SÁCH TRONG FRAME ======
  async function renderShelfInFrame(){
    try {
      const res = await fetch("/public/content/storybook/library-manifest.json", {cache:"no-cache"});
      if (!res.ok) throw new Error("Không tải được manifest thư viện");
      const lib = await res.json();
      const books = Array.isArray(lib.books) ? lib.books : [];

      shelfEl.hidden = false;
      shelfEl.innerHTML = `
        <h3 class="shelf-title">Kệ sách</h3>
        <div class="shelf-grid">
          ${
            books.map(b => `
              <article class="book-card" data-book="${b.id}">
                <img class="book-card__cover" src="${b.cover || '/public/assets/bg/nini_home.webp'}" alt="${b.title_vi || b.title_en || b.id}" />
                <div>
                  <h4 class="book-card__title">${b.title_vi || b.title_en || b.id}</h4>
                  <div class="book-card__meta">Tác giả: ${b.author || '—'}</div>
                </div>
              </article>
            `).join("")
          }
        </div>
      `;

      // click mở reader
      shelfEl.querySelectorAll(".book-card").forEach(card=>{
        card.addEventListener("click", ()=> openReader(card.dataset.book));
      });

    } catch (e) {
      shelfEl.hidden = false;
      shelfEl.innerHTML = `<p>Chưa có sách. Đặt <code>/public/content/storybook/library-manifest.json</code> và các file <code>/public/content/storybook/&lt;ID&gt;.json</code>.</p>`;
      console.error(e);
    }
  }

  // ====== READER MODAL (tạo DOM động) ======
  function ensureReaderModal(){
    let modal = document.getElementById("readerModal");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.className = "modal";
    modal.id = "readerModal";
    modal.setAttribute("aria-hidden","true");
    modal.innerHTML = `
      <div class="modal__backdrop" data-reader-close></div>
      <div class="modal__panel" role="dialog" aria-modal="true">
        <button class="modal__close" data-reader-close aria-label="Đóng">×</button>
        <h3 class="modal__title" id="readerTitle">
          <img src="/public/assets/icons/logonini.webp" alt="" class="modal__logo" />
          <span id="readerBookTitle">Đang tải…</span>
        </h3>

        <!-- Khung 16:9 -->
        <div class="reader">
          <div class="reader__image" id="readerImageBg"></div>

          <div class="reader__topbar">
            <button class="pill" id="btnLangVi" aria-current="true">VI</button>
            <button class="pill" id="btnLangEn">EN</button>
            <button class="pill" id="btnSpeak" title="Đọc audio">🔊</button>
          </div>

          <div class="reader__subtitle" id="readerSubtitle"></div>

          <div class="reader__pager">
            <button class="circle" id="btnPrev">‹</button>
            <div id="pageInfo">Trang 1/1</div>
            <button class="circle" id="btnNext">›</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // đóng modal
    modal.addEventListener("click", (e)=>{
      if (e.target.matches("[data-reader-close]")) {
        modal.setAttribute("aria-hidden","true");
      }
    });

    return modal;
  }

  async function openReader(bookId){
    try{
      const url = `/public/content/storybook/${bookId}.json`;
      const res = await fetch(url, {cache:"no-cache"});
      if(!res.ok) throw new Error("Không tải được sách: "+bookId);
      currentBook = await res.json();
      pageIdx = 0;

      // set tiêu đề
      const modal = ensureReaderModal();
      modal.querySelector("#readerBookTitle").textContent = currentBook.title_vi || currentBook.title_en || bookId;
      modal.setAttribute("aria-hidden","false");

      // bind sự kiện
      modal.querySelector("#btnPrev").onclick = ()=> { if(pageIdx>0){ pageIdx--; renderPage(); } };
      modal.querySelector("#btnNext").onclick = ()=> { if(pageIdx < (currentBook.pages?.length||1)-1){ pageIdx++; renderPage(); } };
      modal.querySelector("#btnLangVi").onclick = ()=> { lang="vi"; renderPage(); setLangButtons(); };
      modal.querySelector("#btnLangEn").onclick = ()=> { lang="en"; renderPage(); setLangButtons(); };
      modal.querySelector("#btnSpeak").onclick  = ()=> playAudioForCurrent();

      setLangButtons();
      renderPage();
    }catch(err){
      alert(err.message);
      console.error(err);
    }
  }

  function setLangButtons(){
    const m = document.getElementById("readerModal");
    m.querySelector("#btnLangVi").setAttribute("aria-current", lang==="vi" ? "true" : "false");
    m.querySelector("#btnLangEn").setAttribute("aria-current", lang==="en" ? "true" : "false");
  }

  function renderPage(){
    if(!currentBook) return;
    const pages = currentBook.pages || [];
    const total = pages.length || 1;
    const p = pages[pageIdx] || {};

    const modal = document.getElementById("readerModal");
    const imgBg = modal.querySelector("#readerImageBg");
    const sub   = modal.querySelector("#readerSubtitle");
    const info  = modal.querySelector("#pageInfo");

    // ảnh trang
    const bg = p.image || currentBook.cover || "/public/assets/bg/nini_home.webp";
    imgBg.style.backgroundImage = `url("${bg}")`;

    // phụ đề theo ngôn ngữ
    const text = (lang==="vi" ? p.text_vi : p.text_en) || "";
    sub.innerHTML = text.replace(/\n/g,"<br/>");

    info.textContent = `Trang ${Math.min(pageIdx+1,total)}/${total||1}`;
  }

  function playAudioForCurrent(){
    if(!currentBook) return;
    const p = (currentBook.pages||[])[pageIdx] || {};
    const src = (lang==="vi" ? p.sound_vi : p.sound_en) || "";
    if(!src) return;
    const audio = new Audio(src);
    audio.play().catch(()=>{});
  }

  // ====== START ======
  bootSeasonFromHash();
  window.addEventListener("hashchange", bootSeasonFromHash);

  // preload ảnh để chuyển mượt
  Object.values(IMAGES).forEach(src => { const i = new Image(); i.src = src; });
})();
