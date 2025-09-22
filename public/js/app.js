/* NiNi — App JS (đường dẫn tuyệt đối, JS thuần, FULL) */
(() => {
  /* ================== UTILS ================== */
  async function fetchJSON(url) {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    return r.json();
  }

  /* ================== CONSTANTS ================== */
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

  /* ================== SEASON ================== */
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
      // phát hashchange để các phần khác (effects) nghe được
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }

    // hiển thị kệ sách ở Spring, còn tab khác thì ẩn
    const shelfMount = document.getElementById("shelfMount");
    if (shelfMount) shelfMount.hidden = (season !== "spring");
    if (season === "spring") loadShelf(); // lazy
  }

  function bootSeasonFromHash() {
    const raw = (location.hash || "").replace(/^#\/?/, "");
    const s = (raw || "home").toLowerCase();
    setSeason(IMAGES[s] ? s : "home");
  }

  tabs.forEach(btn => btn.addEventListener("click", () => setSeason(btn.dataset.season)));

  /* ================== CHIPS (sections) ================== */
  const chips = document.querySelectorAll(".chip");
  const SECTIONS = {
    intro: `<h2>NiNi — Funny</h2>
      <p>Bạn có nghĩ việc học tiếng Anh là một thử thách khó nhằn và đầy áp lực không? Hãy quên đi cách học truyền thống và khám phá một thế giới hoàn toàn mới với <strong>NiNi — Funny</strong>!</p>
      <p>Với slogan "Chơi mê ly, bứt phá tư duy", NiNi-Funny không chỉ là một trò chơi giải trí, mà còn là công cụ giúp bạn:</p>
      <ul>
        <li>Đắm chìm vào cuộc phiêu lưu: Khám phá những màn chơi đầy màu sắc, giải đố những câu chuyện hấp dẫn và chinh phục các thử thách ngôn ngữ một cách tự nhiên.</li>
        <li>Học mà như chơi: Mở rộng vốn từ vựng, rèn luyện ngữ pháp và tăng khả năng phản xạ tiếng Anh thông qua các mini-game vui nhộn và sáng tạo.</li>
        <li>Phát triển bản thân: Bứt phá khỏi những giới hạn của bản thân, tư duy logic và kỹ năng giải quyết vấn đề của bạn sẽ được nâng cao một cách đáng kể.</li>
      </ul>
      <p>Hãy tải <strong>NiNi — Funny</strong> ngay hôm nay và bắt đầu hành trình biến tiếng Anh thành một niềm vui bất tận.</p>`,
    rules: `<h2>Luật chơi</h2>
      <p>Mỗi mini game có hướng dẫn ngắn ngay trước khi bắt đầu. Chơi vui, công bằng và tôn trọng bạn chơi.</p>`,
    forum: `<h2>Diễn đàn</h2><p>Góc để bạn khoe thành tích, trao đổi mẹo chơi và đặt câu hỏi.</p>`,
    feedback:`<h2>Góp ý</h2>
      <p>Bạn có ý tưởng trò chơi mới hoặc phát hiện lỗi? Hãy góp ý để NiNi tốt hơn!</p>
      <p>suport@nini-funny.com | admin@nini-funny.com</p>`
  };
  chips.forEach(ch => {
    ch.addEventListener("click", () => {
      chips.forEach(c => c.classList.toggle("is-active", c === ch));
      content.innerHTML = SECTIONS[ch.dataset.section] || SECTIONS.intro;
    });
  });

  /* ================== AUTH MODAL ================== */
  const authBtn   = document.getElementById("authBtn");
  const authModal = document.getElementById("authModal");
  if (authBtn && authModal) {
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

  /* ================== SHELF (trong frame) ================== */
  const shelfMount = document.getElementById("shelfMount");
  let manifest = null;

  async function loadShelf() {
    if (!shelfMount || !shelfMount.hidden) {
      // hidden false là đang hiển thị — cứ render (idempotent)
    }
    try {
      if (!manifest) {
        manifest = await fetchJSON("/public/content/storybook/library-manifest.json");
      }
      renderShelf(manifest?.books || []);
    } catch (e) {
      shelfMount.innerHTML = `<div class="shelf">
        <h3 class="shelf__title">Kệ sách</h3>
        <p class="muted">Chưa có sách. Đặt <code>/public/content/storybook/library-manifest.json</code> và các file <code>/public/content/storybook/&lt;ID&gt;.json</code>.</p>
      </div>`;
      shelfMount.hidden = false;
    }
  }

  function renderShelf(books = []) {
    const html = books.map(b => `
      <article class="book-card" data-book="${b.id}">
        <img class="book-card__cover" src="${b.cover || '/public/assets/bg/nini_home.webp'}" alt="${b.title_vi || b.title_en || b.id}">
        <div class="book-card__body">
          <h4 class="book-card__title">${b.title_vi || b.title_en || b.id}</h4>
          <div class="book-card__meta">Tác giả: ${b.author || ''}</div>
        </div>
      </article>
    `).join("");

    shelfMount.innerHTML = `<div class="shelf">
      <h3 class="shelf__title">Kệ sách</h3>
      <div class="shelf__grid">${html}</div>
    </div>`;
    shelfMount.hidden = false;

    // click mở reader
    shelfMount.querySelectorAll(".book-card").forEach(card => {
      card.addEventListener("click", () => openReader(card.dataset.book));
    });
  }

  /* ================== READER (modal 16:9 + subtitle) ================== */
  const readerModal = document.getElementById("readerModal");
  const readerPanel = document.getElementById("readerPanel"); // panel nội dung
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
  let lang = localStorage.getItem("reader_lang") || "vi";

  // fallback ảnh
  if (readerImg) {
    readerImg.onerror = () => {
      readerImg.onerror = null;
      readerImg.src = "/public/assets/bg/nini_home.webp";
    };
  }

  // map key cũ từ editor
  function mapPageFields(p){
    return {
      image   : p.image    || p.L_image_P || p.L_image || "",
      text_vi : p.text_vi  || p.noidung_vi || "",
      text_en : p.text_en  || p.noidung_en || "",
      sound_vi: p.sound_vi || p.L_sound_vi || "",
      sound_en: p.sound_en || p.L_sound_en || ""
    };
  }

  function setLang(newLang){
    lang = newLang;
    localStorage.setItem("reader_lang", lang);
    if (btnVI && btnEN) {
      btnVI.classList.toggle("is-active", lang==="vi");
      btnEN.classList.toggle("is-active", lang==="en");
    }
    renderPage();
  }

  if (btnVI) btnVI.addEventListener("click", ()=> setLang("vi"));
  if (btnEN) btnEN.addEventListener("click", ()=> setLang("en"));

  if (btnSpeak) {
    btnSpeak.addEventListener("click", ()=>{
      if(!currentBook) return;
      const raw = currentBook.pages?.[pageIdx] || {};
      const p = mapPageFields(raw);
      const text = (lang==="vi" ? p.text_vi : p.text_en) || "";
      if(!text) return;
      try{
        const u = new SpeechSynthesisUtterance(text);
        u.lang = (lang==="vi") ? "vi-VN" : "en-US";
        speechSynthesis.cancel();
        speechSynthesis.speak(u);
      }catch(_){}
    });
  }

  function showReader(show){
    if (!readerModal) return;
    readerModal.setAttribute("aria-hidden", show ? "false" : "true");
    if(!show){ try{ speechSynthesis.cancel(); }catch(_){ } }
  }

  if (readerModal) {
    readerModal.querySelectorAll("[data-reader-close]").forEach(el=>{
      el.addEventListener("click", ()=> showReader(false));
    });
    readerModal.addEventListener("click", e=>{
      if(e.target === readerModal || e.target.classList.contains("modal__backdrop")){
        showReader(false);
      }
    });
  }

  if (btnPrev) btnPrev.addEventListener("click", ()=>{
    if(!currentBook) return;
    if(pageIdx>0){ pageIdx--; renderPage(); }
  });
  if (btnNext) btnNext.addEventListener("click", ()=>{
    if(!currentBook) return;
    if(pageIdx < (currentBook.pages?.length||0)-1){ pageIdx++; renderPage(); }
  });

  async function openReader(bookId){
    try{
      const book = await fetchJSON(`/public/content/storybook/${bookId}.json`);
      currentBook = book;
      pageIdx = 0;
      if (readerTitle) readerTitle.textContent = book.title_vi || book.title_en || bookId;
      setLang(lang); // sẽ gọi renderPage()
      showReader(true);
    }catch(e){
      alert("Không tải được sách: " + e.message);
    }
  }

  function renderPage(){
    if(!currentBook || !readerImg) return;
    const total = currentBook.pages?.length || 0;
    const raw = currentBook.pages[pageIdx] || {};
    const p = mapPageFields(raw);

    const imgUrl = p.image || currentBook.cover || "/public/assets/bg/nini_home.webp";
    readerImg.src = imgUrl;

    const text = (lang==="vi" ? p.text_vi : p.text_en) || "";
    if (subtitleEl) subtitleEl.textContent = text;

    if (infoEl) {
      infoEl.textContent = `Trang ${Math.min(pageIdx+1, total||1)}/${total || 1}`;
    }
    if (btnPrev) btnPrev.disabled = (pageIdx<=0);
    if (btnNext) btnNext.disabled = (pageIdx>=total-1);
  }

  /* ================== STARTUP ================== */
  bootSeasonFromHash();
  window.addEventListener("hashchange", bootSeasonFromHash);

  // preload ảnh nền
  Object.values(IMAGES).forEach(src => { const i = new Image(); i.src = src; });

})();
