/* =========================================================
   NiNi — Stage (Home) : Sidebar + Storybook + Reader
   - Single-render skeleton
   - One-time event binding
   - Replace content per page
   ========================================================= */
(() => {
  const N = window.NINI;                             // tiện viết
  const $ = (sel, ctx=document) => ctx.querySelector(sel);
  const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));

  /* ---------- 0) STATE chia sẻ ---------- */
  const PATHS = {
    manifest: "/public/content/storybook/library-manifest.json",
    book: (id) => `/public/content/storybook/${id}.json`
  };

  let LIB = [];                                      // danh mục sách
  let CUR = { bookMeta: null, bookData: null, page: 0, lang: "vi" };
  let player = new Audio();                          // âm thanh dùng chung
  player.preload = "auto";

  /* ---------- 1) SKELETON: render 1 lần ---------- */
  function renderStage(root) {
    root.innerHTML = `
      <div class="nini-layout">
        <!-- Sidebar: icon only -->
        <aside class="nini-side glass">
          <div class="side-icons" id="side_icons">
            ${[
              {k:"storybook", lbl:"Storybook", ico:"/public/assets/icons/book.webp"},
              {k:"video",     lbl:"Video",     ico:"/public/assets/icons/video.webp"},
              {k:"game",      lbl:"Game",      ico:"/public/assets/icons/game.webp"},
              {k:"shop",      lbl:"Shop",      ico:"/public/assets/icons/shop.webp"},
              {k:"note",      lbl:"Thông báo", ico:"/public/assets/icons/note.webp"},
              {k:"chat",      lbl:"Chat",      ico:"/public/assets/icons/chat.webp"},
              {k:"setting",   lbl:"Cài đặt",   ico:"/public/assets/icons/setting.webp"},
              {k:"user",      lbl:"Cá nhân",   ico:"/public/assets/icons/user.webp"},
            ].map(item => `
              <button class="icon-btn" data-key="${item.k}" aria-label="${item.lbl}">
                <span class="icon">
                  <img src="${item.ico}" alt="${item.lbl}" width="28" height="28"
                       onerror="this.onerror=null;this.src='${item.ico.replace('.webp','.png')}'">
                </span>
                <span class="lbl">${item.lbl}</span>
              </button>
            `).join("")}
          </div>
        </aside>

        <!-- Middle: Storybook list -->
        <section class="nini-middle">
          <section class="panel glass storybook">
            <div class="sb-head">📚 Storybook</div>
            <div id="lib_list" class="lib-grid"></div>
          </section>
        </section>

        <!-- Right: Reader (cố định khung, chỉ thay nội dung) -->
        <main class="nini-main">
          <section class="panel glass story-reader" id="reader_panel" hidden>
            <div class="panel-head">
              <h2 id="reader_title">NiNi</h2>
              <div class="reader-controls">
                <button class="btn small" data-lang="vi" id="btn_vi">VI</button>
                <button class="btn small" data-lang="en" id="btn_en">EN</button>
                <button class="btn small" id="btn_speak" title="Phát/ dừng âm thanh">🔊</button>
                <button class="btn small" id="btn_close" title="Đóng">Đóng</button>
              </div>
            </div>

            <div class="reader-stage">
              <figure class="reader-image">
                <img id="reader_img" alt="" decoding="async" loading="lazy">
              </figure>
              <div class="reader-text" id="reader_text"></div>
              <div class="reader-nav">
                <div>
                  <button class="btn small" id="btn_prev">‹ Trang trước</button>
                  <span class="page-indicator" id="page_info">1/1</span>
                </div>
                <button class="btn small" id="btn_next">Trang sau ›</button>
              </div>
            </div>
          </section>
        </main>
      </div>
    `;

    bindSidebar(root);
    loadLibraryAndRender();
    bindReaderOnce(root);   // gắn event cho các nút reader – chỉ 1 lần
  }

  /* ---------- 2) Sidebar ---------- */
  function bindSidebar(root){
    const side = $("#side_icons", root);
    side.addEventListener("click", (e) => {
      const btn = e.target.closest(".icon-btn");
      if (!btn) return;
      const key = btn.dataset.key;

      // Chỉ xử lý "storybook" ở trang home
      if (key === "storybook") {
        $("#reader_panel").hidden = true;            // ẩn reader khi chưa chọn truyện
        return;
      }
      // Các mục khác: tuỳ bạn route (giữ nguyên anchor)
      // location.hash = `#/${key}`;
    });
  }

  /* ---------- 3) Library list ---------- */
  async function loadLibraryAndRender(){
    try {
      const res = await fetch(PATHS.manifest, {cache:"no-store"});
      const data = await res.json();
      LIB = (data.books || []);
      renderLibraryList();
    } catch (err){
      console.error("Load manifest error:", err);
      $("#lib_list").innerHTML = `<div class="lib-card">Không tải được thư viện.</div>`;
    }
  }

  function renderLibraryList(){
    const list = $("#lib_list");
    list.innerHTML = LIB.map(b => `
      <article class="lib-card" data-id="${b.id}">
        <div class="lib-cover"><img src="${b.cover}" alt="${escapeHtml(b.title_vi)}"></div>
        <div>
          <h4 class="lib-title">${escapeHtml(b.title_vi)}</h4>
          <p class="lib-author">Tác giả: ${escapeHtml(b.author || "—")}</p>
        </div>
      </article>
    `).join("");

    list.addEventListener("click", async (e)=>{
      const card = e.target.closest(".lib-card");
      if (!card) return;
      await openBook(card.dataset.id);
    }, { once: true }); // chỉ gắn 1 lần cho list; sau lần đầu có thể reload list nếu cần
  }

  /* ---------- 4) Open book + render page ---------- */
  async function openBook(bookId){
    stopAudio();
    CUR.bookMeta = LIB.find(x => String(x.id) === String(bookId)) || null;
    $("#reader_title").textContent = (CUR.bookMeta?.title_vi || "NiNi");

    try{
      const res = await fetch(PATHS.book(bookId), {cache:"no-store"});
      CUR.bookData = await res.json();
      CUR.page = 0;
      $("#reader_panel").hidden = false;
      renderPage();
    }catch(err){
      console.error("Load book error:", err);
      $("#reader_text").textContent = "Không tải được nội dung truyện.";
      $("#reader_img").removeAttribute("src");
      $("#reader_panel").hidden = false;
    }
  }

  function renderPage(){
    if (!CUR.bookData) return;
    const p = CUR.bookData.pages[CUR.page];
    if (!p) return;

    const lang = CUR.lang === "en" ? "en" : "vi";
    const textKey = lang === "en" ? "noidung_en" : "noidung_vi";
    const imgKey  = lang === "en" ? "_L_image_en" : "_L_image_vi";
    const sndKey  = lang === "en" ? "_L_sound_en" : "_L_sound_vi";

    // Ảnh: luôn replace
    const img = $("#reader_img");
    img.src = p[imgKey] || "";
    img.alt = CUR.bookMeta?.title_vi || "Story image";

    // Text
    $("#reader_text").textContent = p[textKey] || "";

    // Page indicator
    $("#page_info").textContent = `${CUR.page + 1}/${CUR.bookData.pages.length}`;

    // Lưu đường dẫn audio trang hiện tại (không auto play)
    player.src = p[sndKey] || "";
  }

  /* ---------- 5) Reader controls (gắn 1 lần) ---------- */
  function bindReaderOnce(root){
    const panel   = $("#reader_panel", root);
    const btnVI   = $("#btn_vi", panel);
    const btnEN   = $("#btn_en", panel);
    const btnSpk  = $("#btn_speak", panel);
    const btnPrev = $("#btn_prev", panel);
    const btnNext = $("#btn_next", panel);
    const btnClose= $("#btn_close", panel);

    btnVI.addEventListener("click", () => { CUR.lang = "vi"; renderPage(); });
    btnEN.addEventListener("click", () => { CUR.lang = "en"; renderPage(); });

    btnSpk.addEventListener("click", () => {
      if (!player.src) return;
      if (player.paused) player.play().catch(()=>{});
      else stopAudio();
    });

    btnPrev.addEventListener("click", () => {
      if (!CUR.bookData) return;
      if (CUR.page > 0) { CUR.page--; stopAudio(); renderPage(); }
    });
    btnNext.addEventListener("click", () => {
      if (!CUR.bookData) return;
      const max = CUR.bookData.pages.length - 1;
      if (CUR.page < max) { CUR.page++; stopAudio(); renderPage(); }
    });

    btnClose.addEventListener("click", () => {
      stopAudio();
      $("#reader_panel").hidden = true;
    });

    // Dọn audio khi rời trang
    window.addEventListener("beforeunload", stopAudio);
  }

  function stopAudio(){
    try{ player.pause(); player.currentTime = 0; }catch{}
  }

  /* ---------- 6) Utils ---------- */
  function escapeHtml(s=""){
    return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  /* ---------- 7) Mount ---------- */
  N.mountOnce?.("#stage", renderStage) || renderStage($("#stage"));
})();
