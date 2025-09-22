/* =========================================================
   NiNi — Funny  |  public/js/app.js (clean / full)
   ========================================================= */

(() => {
  /* ===========================
   * 1) CONSTANTS / STATE
   * =========================== */
  const IMAGES = {
    home:  "/public/assets/bg/nini_home.webp",
    spring:"/public/assets/images/seasons/spring.webp",
    summer:"/public/assets/images/seasons/summer.webp",
    autumn:"/public/assets/images/seasons/autumn.webp",
    winter:"/public/assets/images/seasons/winter.webp",
  };

  // Đường dẫn dữ liệu sách
  const LIB_PATH   = "/public/content/storybook";
  const MANIFEST   = `${LIB_PATH}/library-manifest.json`;

  // DOM chung
  const tabs    = document.querySelectorAll("#seasonTabs .tab");
  const frame   = document.getElementById("frame");
  const content = document.getElementById("content");

  // Kệ sách trong khung
  const shelfMount = document.getElementById("shelfMount");

  // Reader modal (kiểu 16:9 – calendar view)
  const readerModal   = document.getElementById("readerModal");
  const modalPanel    = readerModal?.querySelector(".modal__panel");
  const modalBackdrop = readerModal?.querySelector("[data-reader-close]");
  const modalCloseBtn = readerModal?.querySelector("[data-reader-close]");
  const readerTitleEl = readerModal?.querySelector(".modal__title");

  // === NOTE: Các phần tử bên trong calendar view (đúng ID theo HTML bạn đang có)
  const calendarBg     = document.getElementById("calendarBg");
  const subtitleBubble = document.getElementById("subtitleBubble");
  const imgPrev        = document.getElementById("imgPrev");
  const imgNext        = document.getElementById("imgNext");
  const pageInfoEl     = document.getElementById("readerPageInfo"); // có thì cập nhật, không có thì bỏ qua

  // Toolbar ngôn ngữ (nếu bạn có)
  const btnLangVi = document.getElementById("langVi");
  const btnLangEn = document.getElementById("langEn");

  // State đọc sách
  let library = [];         // danh sách đầu sách từ manifest
  let currentBook = null;   // object sách đang đọc
  let pageIdx = 0;          // index trang hiện tại
  let currentLang = "vi";   // 'vi' | 'en'
  const synth = window.speechSynthesis;

  /* ===========================
   * 2) HELPERS
   * =========================== */
  async function fetchJSON(url){
    try{
      const res = await fetch(url, {cache:"no-store"});
      if(!res.ok) throw new Error(res.status + " " + res.statusText);
      return await res.json();
    }catch(err){
      console.warn("fetchJSON error:", url, err);
      return null;
    }
  }
  function setHashSeason(season){
    const newHash = `#/${season}`;
    if (location.hash !== newHash) {
      history.replaceState({}, "", newHash);
      // kích hiệu ứng/logic dựa theo hash (effects.js đang nghe)
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }
  }
  function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }

  /* ===========================
   * 3) SEASON ROUTER
   * =========================== */
  function setSeason(season){
    const img = IMAGES[season] || IMAGES.home;
    document.documentElement.style.setProperty("--bg-url", `url("${img}")`);
    if (frame) frame.style.backgroundImage = `url("${img}")`;
    tabs.forEach(b => b.classList.toggle("is-active", b.dataset.season === season));
    setHashSeason(season);

    // Chỉ hiển thị kệ sách ở tab "spring" (theo yêu cầu UI)
    if (shelfMount){
      if (season === "spring"){
        shelfMount.hidden = false;
        if (!shelfMount.dataset.rendered) renderShelf(); // render 1 lần
      } else {
        shelfMount.hidden = true;
      }
    }
  }
  function bootSeasonFromHash(){
    const raw = (location.hash || "").replace(/^#\/?/, "");
    const s = (raw || "home").toLowerCase();
    setSeason(IMAGES[s] ? s : "home");
  }
  tabs.forEach(btn => btn.addEventListener("click", () => setSeason(btn.dataset.season)));
  window.addEventListener("hashchange", bootSeasonFromHash);

  /* ===========================
   * 4) STATIC CONTENT CHIPS
   * =========================== */
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
      <p>Mỗi mini game có hướng dẫn ngắn ngay trước khi bắt đầu. Chơi vui, công bằng và tôn trọng bạn chơi.</p>
      <p>Tuy nhiên, mình sẽ tiết lộ một bí mật nho nhỏ, bạn muốn kiếm được nhiều xu thì hãy tham gia CLUB hoặc tự mình thành lập một CLUB cho riêng mình.</p>
      <p>Điều kiện thành lập CLUB:</p>
      <ul>
        <li> Bạn phải là thành viên của gia đình Nini bằng cách đăng nhập.</li>
        <li> Tại thời điểm xin tạo CLUB, xu của bạn &ge; 400 xu</li>
      </ul>`,
    forum: `<h2>Diễn đàn</h2><p>Góc để bé khoe thành tích, trao đổi mẹo chơi và đặt câu hỏi.</p>`,
    feedback:`<h2>Góp ý</h2>
      <p>Bạn có ý tưởng trò chơi mới hoặc phát hiện lỗi? Hãy góp ý để NiNi tốt hơn!</p>
      <p>Mọi đóng góp ý kiến xin gửi về: <strong>suport@nini-funny.com</strong><br>
         Liên hệ kỹ thuật: <strong>admin@nini-funny.com</strong></p>`
  };
  chips.forEach(ch => {
    ch.addEventListener("click", () => {
      chips.forEach(c => c.classList.toggle("is-active", c === ch));
      if (content) content.innerHTML = SECTIONS[ch.dataset.section] || SECTIONS.intro;
    });
  });

  /* ===========================
   * 5) AUTH MODAL (giữ nguyên)
   * =========================== */
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
    if (e.target === authModal || e.target.classList?.contains("modal__backdrop")) closeAuth();
  });
  tabLines.forEach(t => t.addEventListener("click", () => switchAuth(t.dataset.auth)));

  /* ===========================
   * 6) BOOKSHELF (kệ trong khung)
   * =========================== */
  async function loadLibrary(){
    const lib = await fetchJSON(MANIFEST);
    return Array.isArray(lib?.books) ? lib.books : [];
  }

  async function renderShelf(){
    if (!shelfMount) return;
    library = await loadLibrary();

    if (!library.length){
      shelfMount.innerHTML = `
        <h4>Kệ sách</h4>
        <div class="muted">Chưa có sách. Đặt <code>${MANIFEST}</code> và các file <code>${LIB_PATH}/&lt;ID&gt;.json</code>.</div>
      `;
      shelfMount.dataset.rendered = "1";
      return;
    }

    const html = `
      <h4>Kệ sách</h4>
      <div class="shelf-list">
        ${library.map(b => `
          <article class="book-card" data-book="${b.id}">
            <img class="book-card__cover" src="${b.cover || '/public/assets/bg/nini_home.webp'}" alt="${b.title_vi || b.title_en || b.id}">
            <div class="book-card__body">
              <div class="book-card__title">${b.title_vi || b.title_en || b.id}</div>
              <div class="book-card__meta">Tác giả: ${b.author || ''}</div>
            </div>
          </article>
        `).join("")}
      </div>
    `;
    shelfMount.innerHTML = html;
    shelfMount.dataset.rendered = "1";

    shelfMount.querySelectorAll(".book-card").forEach(card=>{
      card.addEventListener("click", () => openReader(card.dataset.book));
    });
  }

  /* ===========================
   * 7) READER (calendar-view 16:9)
   * =========================== */

  // === NOTE: mở reader bằng ID từ manifest
  async function openReader(bookId){
    const meta = library.find(b => b.id === bookId);
    if (!meta){
      console.warn("Book not found in manifest:", bookId);
      return;
    }
    const book = await fetchJSON(`${LIB_PATH}/${bookId}.json`);
    if (!book){
      console.warn("Book JSON not found:", bookId);
      return;
    }
    currentBook = { ...meta, ...book };
    pageIdx = 0;

    // Tiêu đề modal
    if (readerTitleEl){
      readerTitleEl.innerHTML = `
        <img src="/public/assets/icons/logonini.webp" alt="" class="modal__logo" />
        ${currentBook.title_vi || currentBook.title_en || currentBook.id}
      `;
    }

    // Bật modal
    readerModal?.setAttribute("aria-hidden", "false");

    // Render trang đầu
    renderPage();
  }

  // Đóng modal khi click backdrop hoặc nút ×
  modalBackdrop?.addEventListener("click", ()=> readerModal?.setAttribute("aria-hidden","true"));
  modalCloseBtn?.addEventListener("click", ()=> readerModal?.setAttribute("aria-hidden","true"));

  // Điều hướng trang
  imgPrev?.addEventListener("click", ()=>{
    if (!currentBook) return;
    pageIdx = clamp(pageIdx-1, 0, (currentBook.pages?.length||1)-1);
    renderPage(true); // animate = true
  });
  imgNext?.addEventListener("click", ()=>{
    if (!currentBook) return;
    pageIdx = clamp(pageIdx+1, 0, (currentBook.pages?.length||1)-1);
    renderPage(true);
  });

  // Chuyển ngôn ngữ đọc
  btnLangVi?.addEventListener("click", ()=>{
    currentLang = "vi";
    btnLangVi.classList.add("active");
    btnLangEn?.classList.remove("active");
    renderPage();
  });
  btnLangEn?.addEventListener("click", ()=>{
    currentLang = "en";
    btnLangEn.classList.add("active");
    btnLangVi?.classList.remove("active");
    renderPage();
  });

  // Phát voice theo ngôn ngữ đang chọn
  document.getElementById("btnSpeakVi")?.addEventListener("click", ()=> speakCurrent("vi"));
  document.getElementById("btnSpeakEn")?.addEventListener("click", ()=> speakCurrent("en"));

  function speakCurrent(lang){
    if (!currentBook) return;
    const p = currentBook.pages?.[pageIdx] || {};
    const text = (lang === "vi") ? (p.text_vi || "") : (p.text_en || "");
    if (!text.trim()) return;

    try {
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = (lang === "vi") ? "vi-VN" : "en-US";
      u.rate = 1; u.pitch = 1; u.volume = 1;
      synth.speak(u);
    } catch(e){ console.warn("speech error", e); }
  }

  // === NOTE: Render 1 trang – ảnh làm background, caption nằm TRONG ảnh
  function renderPage(withAnim=false){
    if (!currentBook) return;
    const pages = currentBook.pages || [];
    const p = pages[pageIdx] || {};

    // Ảnh nền 16:9
    if (calendarBg){
      calendarBg.style.backgroundImage = `url("${p.image || currentBook.cover || IMAGES.home}")`;
      if (withAnim){
        calendarBg.classList.remove("flip-in","flip-out");
        calendarBg.classList.add("flip-out");
        setTimeout(()=>{
          calendarBg.classList.remove("flip-out");
          calendarBg.classList.add("flip-in");
          setTimeout(()=> calendarBg.classList.remove("flip-in"), 340);
        }, 10);
      }
    }

    // Caption theo ngôn ngữ đang đọc, hiển thị NẰM TRONG ảnh
    if (subtitleBubble){
      const text = (currentLang === "vi") ? (p.text_vi || "") : (p.text_en || "");
      subtitleBubble.textContent = text.trim();
      subtitleBubble.style.display = text.trim() ? "block" : "none";
    }

    // Số trang (nếu bạn có phần tử hiển thị)
    if (pageInfoEl){
      pageInfoEl.textContent = `Trang ${pageIdx+1}/${pages.length || 1}`;
    }
  }

  /* ===========================
   * 8) STARTUP
   * =========================== */
  // Preload ảnh season để chuyển mượt
  Object.values(IMAGES).forEach(src => { const i = new Image(); i.src = src; });

  bootSeasonFromHash();
})();
