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

  // ====== DATA PATHS (kệ sách) ======
  // Manifest: /public/content/storybook/library-manifest.json
  // Book:     /public/content/storybook/<ID>.json
  const LIBRARY_URL = "/public/content/storybook/library-manifest.json";
  const BOOK_URL = (id) => `/public/content/storybook/${id}.json`;

  const tabs = document.querySelectorAll("#seasonTabs .tab");
  const frame = document.getElementById("frame");
  const content = document.getElementById("content");
  const shelfMount = document.getElementById("shelfMount"); // [SHELF IN FRAME]

  // ====== SET SEASON ======
  function setSeason(season) {
    const img = IMAGES[season] || IMAGES.home;

    // nền ngoài khung
    document.documentElement.style.setProperty("--bg-url", `url("${img}")`);
    // nền trong khung
    frame.style.backgroundImage = `url("${img}")`;

    // active tab
    tabs.forEach(b => b.classList.toggle("is-active", b.dataset.season === season));

    // hash router (cho phép /#/winter hay /#winter đều ok)
    const newHash = `#/${season}`;
    if (location.hash !== newHash) {
      history.replaceState({}, "", newHash);
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }

    // [SHELF IN FRAME] Khi vào Spring: show kệ trong frame
    if (season === "spring") {
      if (shelfMount) shelfMount.hidden = false;
      loadLibrary().then(renderShelfInFrame);
    } else {
      if (shelfMount) { shelfMount.hidden = true; shelfMount.innerHTML = ""; }
      if (content) content.innerHTML = SECTIONS.intro;
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
       <p>Bạn có nghĩ việc học tiếng Anh là một thử thách khó nhằn và đầy áp lực không? Hãy quên đi cách học truyền thống và khám phá một thế giới hoàn toàn mới với <strong>NiNi — Funny</strong>!</p>
    <p>Với slogan "Chơi mê ly, bứt phá tư duy", NiNi-Funny không chỉ là một trò chơi giải trí, mà còn là công cụ giúp bạn:</p>
    <ul>
      <li>Đắm chìm vào cuộc phiêu lưu: Khám phá những màn chơi đầy màu sắc, giải đố những câu chuyện hấp dẫn và chinh phục các thử thách ngôn ngữ một cách tự nhiên.</li>
      <li>Học mà như chơi: Mở rộng vốn từ vựng, rèn luyện ngữ pháp và tăng khả năng phản xạ tiếng Anh thông qua các mini-game vui nhộn và sáng tạo.</li>
      <li>Phát triển bản thân: Bứt phá khỏi những giới hạn của bản thân, tư duy logic và kỹ năng giải quyết vấn đề của bạn sẽ được nâng cao một cách đáng kể.</li>
    </ul>
      <p>Hãy tải <strong>NiNi — Funny</strong> ngay hôm nay và bắt đầu hành trình biến tiếng Anh thành một niềm vui bất tận.</p>`,
    rules: `<h2>Luật chơi</h2><p>Mỗi mini game có hướng dẫn ngắn ngay trước khi bắt đầu. Chơi vui, công bằng và tôn trọng bạn chơi.</p>
    <p>Tuy nhiên, mình sẽ tiếc lộ một bí mật nho nhỏ, bạn muốn kiếm được nhiều xu thì hãy tham gia CLUB hoặc tự mình thành lập một CLUB cho riêng mình.</p>
    <p>Tin mình đi! bạn sẽ thấy điều hấp dẫn ngay thôi! ==>> vào CLUB thôi. </p>
    <p>Điều kiện thành lập CLUB:</p>
    <ul>
    <li> Bạn phải là thành viên của gia đình Nini bằng cách đăng nhập.</li>
    <li> Tại thời điểm xin tạo CLUB, xu của bạn >= 400 xu</li>
    </ul>
    <p> Nếu không đủ điều kiện trên, không sao cả, bạn có thê xin vào CLUB của các bạn khác!Vẫn được rất nhiều ưu đãi không ngờ nha!</p>
    <p> Cố lên...con đường thử thách đang trước mặt bạn...dũng cảm bước đi nào!</p>
    `,
    forum: `<h2>Diễn đàn</h2><p>Góc để bé khoe thành tích, trao đổi mẹo chơi và đặt câu hỏi.</p>`,
    feedback:`<h2>Góp ý</h2><p>Bạn có ý tưởng trò chơi mới hoặc phát hiện lỗi? Hãy góp ý để NiNi tốt hơn!</p>
    <p>Mọi đóng góp ý kiến xin gửi về hòm thư: suport@nini-funny.com!</p>
    <p>Liên hệ kỹ thuật xin gửi về hòm thư: admin@nini-funny.com!</p>
    <p>Xin trân trọng cảm ơn mọi đóng góp ý kiến của các bạn!chúc các bạn vui chơi và có những trãi nghiệm thật thú vị cùng với Nini</p>`
  };
  chips.forEach(ch => {
    ch.addEventListener("click", () => {
      chips.forEach(c => c.classList.toggle("is-active", c === ch));
      if (shelfMount && !shelfMount.hidden) return; // đang ở spring: kệ trong frame
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

  // ====== START ======
  bootSeasonFromHash();
  window.addEventListener("hashchange", bootSeasonFromHash);

  // preload ảnh để chuyển mượt
  Object.values(IMAGES).forEach(src => { const i = new Image(); i.src = src; });

  /* =================== KỆ SÁCH trong khung =================== */
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
        <p class="muted">Chưa có sách. Hãy đặt
        <code>/public/content/storybook/library-manifest.json</code> và
        các sách ở <code>/public/content/storybook/&lt;ID&gt;.json</code>.</p>`;
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

  /* =================== READER (2 trang + nút loa) =================== */
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

  // Không dùng <audio> tag, dùng Audio API để play/pause
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

    // audio
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
  btnNext?.addEventListener
