/* NiNi — App JS (full) */
(() => {
  // ========================================================================
  // 0) CONSTANTS & SAFE GETTERS
  // ========================================================================
  const IMAGES = {
    home:   "/public/assets/bg/nini_home.webp",
    spring: "/public/assets/images/seasons/spring.webp",
    summer: "/public/assets/images/seasons/summer.webp",
    autumn: "/public/assets/images/seasons/autumn.webp",
    winter: "/public/assets/images/seasons/winter.webp",
  };

  // đường dẫn manifest & book
  const LIB_MANIFEST_URL = "/public/content/storybook/library-manifest.json";
  const BOOK_URL = (id) => `/public/content/storybook/${id}.json`;

  // safe query
  const $  = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  // ========================================================================
  // 1) SEASON BACKGROUND + TABS + CHIPS
  // ========================================================================
  const tabs    = $$("#seasonTabs .tab");
  const frame   = $("#frame");
  const content = $("#content");

  function setSeason(season) {
    const img = IMAGES[season] || IMAGES.home;

    // nền ngoài khung
    document.documentElement.style.setProperty("--bg-url", `url("${img}")`);
    // nền trong khung
    if (frame) frame.style.backgroundImage = `url("${img}")`;

    // active tab
    tabs.forEach(b => b.classList.toggle("is-active", b.dataset.season === season));

    // hash router (#/spring)
    const newHash = `#/${season}`;
    if (location.hash !== newHash) {
      history.replaceState({}, "", newHash);
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }

    // Khi đổi mùa → nếu là "spring" thì hiển thị kệ sách trong khung
    if (season === "spring") {
      renderShelfInFrame();
    } else {
      const mount = $("#shelfMount");
      if (mount) mount.hidden = true, mount.innerHTML = "";
    }
  }

  function bootSeasonFromHash() {
    const raw = (location.hash || "").replace(/^#\/?/, "");
    const s = (raw || "home").toLowerCase();
    setSeason(IMAGES[s] ? s : "home");
  }

  tabs.forEach(btn => btn.addEventListener("click", () => setSeason(btn.dataset.season)));

  // Chips nội dung
  const chips = $$(".chip");
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
      <p>Tuy nhiên, mình tiết lộ một bí mật nho nhỏ: muốn kiếm nhiều xu thì hãy tham gia CLUB hoặc lập CLUB riêng!</p>`,
    forum: `<h2>Diễn đàn</h2><p>Góc để khoe thành tích, trao đổi mẹo chơi và đặt câu hỏi.</p>`,
    feedback: `<h2>Góp ý</h2>
      <p>Gửi góp ý về: <a href="mailto:support@nini-funny.com">support@nini-funny.com</a></p>
      <p>Liên hệ kỹ thuật: <a href="mailto:admin@nini-funny.com">admin@nini-funny.com</a></p>`,
  };
  chips.forEach(ch => ch.addEventListener("click", () => {
    chips.forEach(c => c.classList.toggle("is-active", c === ch));
    if (content) content.innerHTML = SECTIONS[ch.dataset.section] || SECTIONS.intro;
  }));

  // ========================================================================
  // 2) AUTH MODAL (đăng nhập/đăng ký)
  // ========================================================================
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
  function closeAuth() { authModal?.setAttribute("aria-hidden", "true"); }
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

  // ========================================================================
  // 3) KỆ SÁCH (render trong khung #frame, mount ở #shelfMount)
  // ========================================================================
  let libraryManifest = null; // cache manifest

  async function fetchJSON(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Fetch fail ${url}: ${res.status}`);
    return await res.json();
  }

  async function loadLibraryManifest() {
    if (libraryManifest) return libraryManifest;
    try {
      const data = await fetchJSON(LIB_MANIFEST_URL);
      libraryManifest = data;
      return data;
    } catch (e) {
      console.warn("Không đọc được manifest:", e);
      return null;
    }
  }

  function tplBookCard(b) {
    const cover = b.cover || "/public/assets/bg/nini_home.webp";
    const title = b.title_vi || b.title_en || b.id || "NiNi book";
    const meta  = b.author ? `Tác giả: ${b.author}` : "";
    return `
      <article class="book-card" data-book="${b.id}">
        <img class="book-card__cover" src="${cover}" alt="${title}">
        <div class="book-card__body">
          <h4 class="book-card__title">${title}</h4>
          <div class="book-card__meta">${meta}</div>
        </div>
      </article>
    `;
  }

  async function renderShelfInFrame() {
    const mount = $("#shelfMount");
    if (!mount) return;
    const data = await loadLibraryManifest();
    if (!data || !Array.isArray(data.books) || !data.books.length) {
      mount.hidden = false;
      mount.innerHTML = `<div class="shelf-empty">Chưa có sách. Đặt <code>${LIB_MANIFEST_URL}</code> và các file <code>/public/content/storybook/&lt;ID&gt;.json</code>.</div>`;
      return;
    }

    const html = data.books.map(tplBookCard).join("");
    mount.hidden = false;
    mount.innerHTML = `<div class="shelf"><h3 class="shelf__title">Kệ sách</h3><div class="shelf__grid">${html}</div></div>`;

    // click mở reader
    mount.querySelectorAll(".book-card").forEach(card => {
      card.addEventListener("click", () => {
        const id = card.dataset.book;
        openBookById(id);
      });
    });
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

  // ========================================================================
  // 4) READER “CALENDAR” 16:9 — preload ảnh + spinner + Prev/Next + VI/EN
  // ========================================================================
  // NOTE: Khối HTML tương ứng đã có trong index.html:
  // <div id="readerModal"> ... <div id="calendarViewport" class="calendar-viewport"> <div id="calendarBg" class="calendar-bg"></div> <div class="spinner"></div> ... </div>
  const readerModal  = $("#readerModal");
  const calViewport  = $("#calendarViewport") || $("#calendarView") || $(".calendar-view"); // chấp nhận vài id/class cũ
  const calBg        = $("#calendarBg") || (calViewport && $(".calendar-bg", calViewport));
  const btnPrevImg   = $("#imgPrev");
  const btnNextImg   = $("#imgNext");

  // tùy HTML của bạn có thể có mấy nút lang khác nhau
  const btnLangVi = $("#langVi") || $('[data-lang="vi"]') || $("#ctlVi");
  const btnLangEn = $("#langEn") || $('[data-lang="en"]') || $("#ctlEn");

  const btnReaderClose = readerModal && $('[data-reader-close]', readerModal);

  let currentBook = null;
  let pageIdx = 0;
  let speakLang = localStorage.getItem("reader_lang") || "vi"; // 'vi' | 'en'

  function pickPageImage(p = {}) {
    return p.image || p.L_image_P || p.img || p.L_image || "";
  }
  function pageTextVi(p = {}) {
    return p.text_vi || p.noidung_vi || "";
  }
  function pageTextEn(p = {}) {
    return p.text_en || p.noidung_en || "";
  }

  function setLang(lang) {
    speakLang = lang === "en" ? "en" : "vi";
    localStorage.setItem("reader_lang", speakLang);
    // style active (nếu có)
    [btnLangVi, btnLangEn].forEach(b => b && b.classList.remove("is-active"));
    if (speakLang === "vi") btnLangVi?.classList.add("is-active");
    else btnLangEn?.classList.add("is-active");
    renderSubtitle();
  }

  // Hiển thị phụ đề (bubble) ở dưới ảnh, chỉ 1 ngôn ngữ đang chọn
  function renderSubtitle() {
    const bubble = $("#subtitleBubble");
    if (!bubble || !currentBook) return;
    const p = (currentBook.pages || [])[pageIdx] || {};
    const txt = speakLang === "en" ? pageTextEn(p) : pageTextVi(p);
    bubble.textContent = txt || "";
  }

  function setLoading(on) {
    if (!calViewport) return;
    calViewport.classList.toggle("is-loading", !!on);
    calViewport.classList.toggle("is-ready", !on);
  }

  function renderPageCounter() {
    const el = $("#readerPageInfo") || $("#pageCounter");
    if (!el || !currentBook) return;
    const total = (currentBook.pages || []).length || 1;
    el.textContent = `Trang ${Math.min(pageIdx + 1, total)}/${total}`;
  }

  // === CORE: render 1 trang ảnh (preload rồi mới show) ===
  function renderCalendarPage() {
    if (!calViewport || !calBg || !currentBook) return;

    const pages = currentBook.pages || [];
    const total = pages.length || 0;
    const p     = pages[pageIdx] || {};

    setLoading(true);
    renderPageCounter();
    renderSubtitle();

    const url = pickPageImage(p);
    if (!url) {
      calBg.style.backgroundImage = "";
      setLoading(false);
      return;
    }
    const tmp = new Image();
    tmp.onload = () => {
      calBg.style.backgroundImage = `url("${url}")`;
      setLoading(false);
    };
    tmp.onerror = () => {
      calBg.style.backgroundImage = "";
      setLoading(false);
    };
    tmp.src = url;
  }

  function openReaderCalendar(book) {
    currentBook = book;
    pageIdx = 0;

    // set tiêu đề (nếu bạn có header trong modal)
    const h = readerModal && $("#readerTitle", readerModal);
    if (h) h.textContent = book.title_vi || book.title_en || book.id || "NiNi Book";

    // mở modal
    readerModal?.setAttribute("aria-hidden", "false");

    // render trang đầu
    renderCalendarPage();
  }

  function closeReader() {
    readerModal?.setAttribute("aria-hidden", "true");
  }

  // NAV ảnh
  btnPrevImg?.addEventListener("click", () => {
    if (!currentBook) return;
    const total = (currentBook.pages || []).length || 0;
    if (pageIdx > 0) { pageIdx--; renderCalendarPage(); }
  });
  btnNextImg?.addEventListener("click", () => {
    if (!currentBook) return;
    const total = (currentBook.pages || []).length || 0;
    if (pageIdx < total - 1) { pageIdx++; renderCalendarPage(); }
  });

  btnLangVi?.addEventListener("click", () => setLang("vi"));
  btnLangEn?.addEventListener("click", () => setLang("en"));
  btnReaderClose?.addEventListener("click", closeReader);
  readerModal?.addEventListener("click", e => {
    if (e.target === readerModal || e.target.classList.contains("modal__backdrop")) closeReader();
  });
  setLang(speakLang); // init active state

  // ========================================================================
  // 5) STARTUP
  // ========================================================================
  bootSeasonFromHash();
  window.addEventListener("hashchange", bootSeasonFromHash);

  // Preload ảnh nền mùa để chuyển mượt
  Object.values(IMAGES).forEach(src => { const i = new Image(); i.src = src; });
})();
