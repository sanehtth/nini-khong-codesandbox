/* NiNi — App JS (FULL, đồng bộ ONE STYLE + hiệu ứng + storybook)
   - Tabs/chips dùng class .is-active (style nổi bật)
   - Gọi fx.setSeason khi đổi mùa (nếu có effects.js)
   - Kệ sách trong frame (Spring)
   - Reader 16:9 + Subtitle + TTS (giữ như bản trước)
*/
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

  const LIB_MANIFEST_URL = "/public/content/storybook/library-manifest.json";
  const BOOK_URL = (id) => `/public/content/storybook/${id}.json`;

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

    // đổi nền toàn trang + trong frame
    document.documentElement.style.setProperty("--bg-url", `url("${img}")`);
    if (frame) frame.style.backgroundImage = `url("${img}")`;

    // active tab
    tabs.forEach(b => b.classList.toggle("is-active", b.dataset.season === season));

    // hash router
    const newHash = `#/${season}`;
    if (location.hash !== newHash) {
      history.replaceState({}, "", newHash);
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }

    // bật hiệu ứng mùa (nếu có fx)
    if (window.fx && typeof window.fx.setSeason === "function") {
      const map = { home:"home", spring:"spring", summer:"summer", autumn:"autumn", winter:"winter" };
      window.fx.setSeason(map[season] || "home");
    }

    // Kệ sách trong frame chỉ khi spring
    if (season === "spring") {
      renderShelfInFrame();
    } else {
      const mount = $("#shelfMount");
      if (mount) { mount.hidden = true; mount.innerHTML = ""; }
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
      <ul>
        <li>Đắm chìm vào cuộc phiêu lưu qua những câu chuyện nhiều màu sắc.</li>
        <li>Học mà như chơi: mini-game vui nhộn, mở rộng từ vựng tự nhiên.</li>
        <li>Bứt phá tư duy, tăng phản xạ và giải quyết vấn đề.</li>
      </ul>`,
    rules: `<h2>Luật chơi</h2><p>Mỗi mini game có hướng dẫn ngắn. Chơi vui, công bằng và tôn trọng bạn chơi.</p>`,
    forum: `<h2>Diễn đàn</h2><p>Góc khoe thành tích, trao đổi mẹo chơi và đặt câu hỏi.</p>`,
    feedback: `<h2>Góp ý</h2>
      <p>Gửi góp ý: <a href="mailto:support@nini-funny.com">support@nini-funny.com</a></p>
      <p>Liên hệ kỹ thuật: <a href="mailto:admin@nini-funny.com">admin@nini-funny.com</a></p>`,
  };
  chips.forEach(ch => ch.addEventListener("click", () => {
    chips.forEach(c => c.classList.toggle("is-active", c === ch));
    if (content) content.innerHTML = SECTIONS[ch.dataset.section] || SECTIONS.intro;
  }));

  // ========================================================================
  // 2) AUTH (nút, modal dùng file public/js/auth.js)
  // ========================================================================
  // Không đổi ở đây — UI đã có id phù hợp với auth.js

  // ========================================================================
  // 3) KỆ SÁCH (render trong khung #frame)
  // ========================================================================
  let libraryManifest = null;

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
      </article>`;
  }

  async function renderShelfInFrame() {
    const mount = $("#shelfMount");
    if (!mount) return;
    const data = await loadLibraryManifest();
    if (!data || !Array.isArray(data.books) || !data.books.length) {
      mount.hidden = false;
      mount.innerHTML = `<div class="shelf"><h3 class="shelf__title">Kệ sách</h3><div class="note">Chưa có sách. Đặt <code>${LIB_MANIFEST_URL}</code> và các file <code>/public/content/storybook/&lt;ID&gt;.json</code>.</div></div>`;
      return;
    }

    const html = data.books.map(tplBookCard).join("");
    mount.hidden = false;
    mount.innerHTML = `<div class="shelf"><h3 class="shelf__title">Kệ sách</h3><div class="shelf__grid">${html}</div></div>`;

    mount.querySelectorAll(".book-card").forEach(card => {
      card.addEventListener("click", () => openBookById(card.dataset.book));
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
  // 4) READER 16:9 + Subtitle + TTS
  // ========================================================================
  const readerModal  = $("#readerModal");
  const calViewport  = $("#calendarViewport");
  const calBg        = $("#calendarBg");
  const btnPrevImg   = $("#imgPrev");
  const btnNextImg   = $("#imgNext");
  const btnLangVi = $("#btnLangVi");
  const btnLangEn = $("#btnLangEn");
  const btnSpeak  = $("#btnSpeak");
  const btnReaderClose = readerModal && $('[data-reader-close]', readerModal);

  let currentBook = null;
  let pageIdx = 0;
  let speakLang = localStorage.getItem("reader_lang") || "vi";

  let isSpeaking = false;
  let speakUtter = null;
  let speakVoices = [];
  function loadVoices(){ try{ speakVoices = speechSynthesis.getVoices(); }catch{ speakVoices=[]; } }
  if (window.speechSynthesis){ loadVoices(); window.speechSynthesis.onvoiceschanged = loadVoices; }
  function pickVoice(langCode){
    if (!speakVoices.length) loadVoices();
    const v = speakVoices.find(v=>v.lang?.toLowerCase().startsWith(langCode));
    return v || speakVoices.find(v=>v.lang?.toLowerCase().startsWith("en")) || null;
  }
  function stopSpeak(){ isSpeaking=false; try{ speechSynthesis.cancel(); }catch{} }
  function speakCurrent(){
    stopSpeak(); if (!currentBook || !window.SpeechSynthesisUtterance) return;
    const p = (currentBook.pages||[])[pageIdx]||{};
    const text = speakLang==="en" ? pageTextEn(p) : pageTextVi(p);
    if (!text?.trim()) return;
    speakUtter = new SpeechSynthesisUtterance(text);
    const voice = pickVoice(speakLang==="en" ? "en" : "vi");
    if (voice) speakUtter.voice = voice;
    speakUtter.rate=1; speakUtter.pitch=1; speakUtter.volume=1;
    speakUtter.onend = ()=>{ isSpeaking=false; };
    speakUtter.onerror = ()=>{ isSpeaking=false; };
    window.speechSynthesis.speak(speakUtter); isSpeaking=true;
  }

  function pickPageImage(p={}){ return p.image || p.L_image_P || p.img || p.L_image || ""; }
  function pageTextVi(p={}){ return p.text_vi || p.noidung_vi || ""; }
  function pageTextEn(p={}){ return p.text_en || p.noidung_en || ""; }

  function setLang(lang){
    speakLang = lang==="en" ? "en" : "vi";
    localStorage.setItem("reader_lang", speakLang);
    [btnLangVi,btnLangEn].forEach(b=>b&&b.classList.remove("is-active"));
    (speakLang==="vi" ? btnLangVi : btnLangEn)?.classList.add("is-active");
    renderSubtitle(); if (isSpeaking) speakCurrent();
  }

  function renderSubtitle(){
    const el = $("#subtitleText"); if (!el || !currentBook) return;
    const p = (currentBook.pages||[])[pageIdx]||{};
    el.textContent = speakLang==="en" ? pageTextEn(p) : pageTextVi(p);
  }

  function setLoading(on){
    if (!calViewport) return;
    calViewport.classList.toggle("is-loading", !!on);
    calViewport.classList.toggle("is-ready", !on);
  }

  function renderPageCounter(){
    const total = (currentBook?.pages||[]).length || 1;
    const txt = `Trang ${Math.min(pageIdx+1,total)}/${total}`;
    const elTop = $("#pageCounterTop"); if (elTop) elTop.textContent = txt;
    const elOld = $("#pageCounter"); if (elOld) elOld.textContent = txt;
  }

  function renderCalendarPage(){
    if (!calViewport || !calBg || !currentBook) return;
    const pages = currentBook.pages || [];
    const p     = pages[pageIdx] || {};
    setLoading(true); renderPageCounter(); renderSubtitle();

    const url = pickPageImage(p);
    if (!url){ calBg.style.backgroundImage=""; setLoading(false); return; }
    const tmp = new Image();
    tmp.onload = ()=>{ calBg.style.backgroundImage = `url("${url}")`; setLoading(false); if (isSpeaking) speakCurrent(); };
    tmp.onerror = ()=>{ calBg.style.backgroundImage=""; setLoading(false); };
    tmp.src = url;
  }

  function openReaderCalendar(book){
    currentBook = book; pageIdx = 0;
    const h = readerModal && $("#readerTitle", readerModal);
    if (h) h.textContent = book.title_vi || book.title_en || book.id || "NiNi Book";
    readerModal?.setAttribute("aria-hidden","false");
    setLang(speakLang); renderCalendarPage();
  }
  function closeReader(){ stopSpeak(); readerModal?.setAttribute("aria-hidden","true"); }

  btnPrevImg?.addEventListener("click", ()=>{ if (!currentBook) return; if (pageIdx>0){ pageIdx--; renderCalendarPage(); } });
  btnNextImg?.addEventListener("click", ()=>{ if (!currentBook) return; const total=(currentBook.pages||[]).length||0; if (pageIdx<total-1){ pageIdx++; renderCalendarPage(); } });
  btnLangVi?.addEventListener("click", ()=> setLang("vi"));
  btnLangEn?.addEventListener("click", ()=> setLang("en"));
  btnSpeak?.addEventListener("click", ()=>{ if(isSpeaking) stopSpeak(); else speakCurrent(); });
  btnReaderClose?.addEventListener("click", closeReader);
  readerModal?.addEventListener("click", e=>{ if (e.target===readerModal || e.target.classList.contains("modal__backdrop")) closeReader(); });
  setLang(speakLang);

  // ========================================================================
  // 5) Admin button hotkey (Alt + A)
  // ========================================================================
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
        localStorage.setItem(ADMIN_KEY, adminBtn.classList.contains("is-hidden") ? "off" : "on");
      }
    });
  })();

  // ========================================================================
  // 6) STARTUP
  // ========================================================================
  bootSeasonFromHash();
  window.addEventListener("hashchange", bootSeasonFromHash);

  // Preload ảnh nền
  Object.values(IMAGES).forEach(src => { const i = new Image(); i.src = src; });

})();
