/*!
 * NiNi — Stage (home) renderer
 * Phần này render: Sidebar icon + Storybook (cột giữa) + Reader (cột phải)
 * - Namespaced, không đè global: chỉ tạo window.NSTAGE để debug (nếu cần)
 * - Chuẩn hoá đường dẫn và fallback ảnh webp → png
 * - Tối thiểu hoá xung đột: chỉ thao tác trong #stage
 */
(() => {
  /* =========================================================
   * [0] Tiện ích nhỏ (helper) — KHÔNG ĐỔI
   * ========================================================= */
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // Chuẩn hoá đường dẫn: giữ http(s), còn lại đảm bảo có "/" đầu
  function resolveAssetPath(p) {
    if (!p) return "";
    if (/^(https?:)?\/\//i.test(p)) return p;
    return p.startsWith("/") ? p : "/" + p;
  }

  // Gán ảnh + fallback .webp -> .png nếu lỗi
  function setImageWithFallback(imgEl, url) {
    if (!imgEl) return;
    const u = resolveAssetPath(url);
    imgEl.onerror = function onerr() {
      if (imgEl.dataset.fallbackTried === "1") { imgEl.onerror = null; return; }
      imgEl.dataset.fallbackTried = "1";
      const png = u.replace(/\.webp(\?.*)?$/i, ".png$1");
      if (png !== u) imgEl.src = png;
      else imgEl.onerror = null;
    };
    imgEl.removeAttribute("hidden");
    imgEl.src = u;
  }

  async function getJSON(url) {
    const u = resolveAssetPath(url);
    const res = await fetch(u, { cache: "no-store" });
    if (!res.ok) throw new Error(`Fetch fail ${u} -> ${res.status}`);
    return res.json();
  }

  /* =========================================================
   * [1] Cấu hình nguồn dữ liệu — CHỈNH NẾU ĐỔI CẤU TRÚC THƯ MỤC
   * ========================================================= */
  const PATHS = {
    // manifest chứa danh sách sách
    manifest: "/public/content/storybook/library-manifest.json",
    // thư mục chứa JSON từng sách (B001.json, B002.json, …)
    bookDir: "/public/content/storybook/",
  };

  /* =========================================================
   * [2] State hiển thị — ĐỪNG ĐỔI TÊN KEY
   * ========================================================= */
  const state = {
    manifest: null,   // dữ liệu manifest
    booksById: {},    // cache json sách theo id
    currentBook: null,
    currentIndex: 0,
    currentLang: "vi", // "vi" | "en"
  };

  /* =========================================================
   * [3] Khung HTML tổng (Layout) — KHỚP VỚI stage.css
   * ========================================================= */
  function layoutHTML() {
    // Sidebar icon: chỉ icon + tooltip label (CSS đã có)
    return `
      <div class="nini-canvas">
        <div class="nini-layout">
          <!-- Sidebar (trái) -->
          <aside class="nini-side glass">
            <div class="side-icons" id="side_icons">
              ${[
                {key:"storybook", label:"Storybook", icon:"/public/assets/icons/book.webp", href:"#/home"},
                {key:"video",     label:"Video",     icon:"/public/assets/icons/video.webp", href:"#/video"},
                {key:"game",      label:"Game",      icon:"/public/assets/icons/game.webp",  href:"#/game"},
                {key:"shop",      label:"Shop",      icon:"/public/assets/icons/shop.webp",  href:"#/shop"},
                {key:"note",      label:"Thông báo", icon:"/public/assets/icons/note.webp",  href:"#/notify"},
                {key:"chat",      label:"Chat",      icon:"/public/assets/icons/chat.webp",  href:"#/chat"},
                {key:"setting",   label:"Cài đặt",   icon:"/public/assets/icons/setting.webp", href:"#/settings"},
                {key:"user",      label:"Cá nhân",   icon:"/public/assets/icons/user.webp", href:"#/profile"},
              ].map(i => `
                <a class="icon-btn" data-key="${i.key}" href="${i.href}">
                  <span class="icon">
                    <img src="${i.icon}" width="28" height="28" alt="${i.label}" />
                  </span>
                  <span class="lbl">${i.label}</span>
                </a>
              `).join("")}
            </div>
          </aside>

          <!-- Cột giữa: Storybook list -->
          <section class="nini-middle">
            <section class="panel glass storybook" id="sb_panel">
              <div class="sb-head">📚 Storybook</div>
              <div class="lib-grid" id="sb_list">
                <!-- render danh sách sách ở đây -->
              </div>
            </section>
          </section>

          <!-- Cột phải: Reader -->
          <main class="nini-main">
            <section class="panel glass story-reader" id="reader_panel">
              <div class="panel-head">
                <h2 id="reader_title">NiNi</h2>
                <div class="reader-controls">
                  <button class="btn small lang" data-lang="vi" id="btn_vi">VI</button>
                  <button class="btn small lang" data-lang="en" id="btn_en">EN</button>
                  <button class="btn small" id="btn_tts" title="Phát/Dừng âm thanh">🔊</button>
                  <button class="btn small seeall reader-close" id="btn_close" title="Đóng">Đóng</button>
                </div>
              </div>

              <div class="reader-stage">
                <div class="reader-image">
                  <img id="reader_img" alt="" />
                </div>
                <div class="reader-text" id="reader_text"></div>
              </div>

              <div class="reader-nav">
                <button class="btn small" id="btn_prev">‹ Trang trước</button>
                <div class="page-indicator" id="page_indicator">1/1</div>
                <button class="btn small" id="btn_next">Trang sau ›</button>
              </div>
            </section>
          </main>
        </div>
      </div>
    `;
  }

  /* =========================================================
   * [4] Storybook: render danh sách ở cột giữa
   * ========================================================= */
  function renderList(root, books) {
    const host = $("#sb_list", root);
    if (!host) return;

    host.innerHTML = books.map(b => `
      <article class="lib-card" data-bookid="${b.id}">
        <div class="lib-cover">
          <img src="${resolveAssetPath(b.cover)}" alt="${b.title_vi}" />
        </div>
        <div class="lib-info">
          <h4 class="lib-title">${b.title_vi}</h4>
          <p class="lib-author">Tác giả: ${b.author || "—"}</p>
        </div>
      </article>
    `).join("");

    // Click để mở Reader
    host.addEventListener("click", onListClick);
  }

  function onListClick(e) {
    const card = e.target.closest(".lib-card");
    if (!card) return;
    const id = card.dataset.bookid;
    openBook(id).catch(console.error);
  }

  /* =========================================================
   * [5] Reader: load sách + render trang
   * ========================================================= */
  async function openBook(bookId) {
    if (!state.manifest) return;

    // Cache JSON sách
    if (!state.booksById[bookId]) {
      const url = PATHS.bookDir + bookId + ".json";
      state.booksById[bookId] = await getJSON(url);
    }
    state.currentBook  = state.booksById[bookId];
    state.currentIndex = 0;
    state.currentLang  = "vi";

    // title
    const title = state.currentBook?.title_vi || state.currentBook?.title_en || "Story";
    $("#reader_title").textContent = title;

    renderReaderPage();
    updateLangButtons();
  }

  function currentPage() {
    const bk = state.currentBook;
    if (!bk || !Array.isArray(bk.pages)) return null;
    return bk.pages[state.currentIndex] || null;
  }

  function renderReaderPage() {
    const page = currentPage();
    const imgEl  = $("#reader_img");
    const textEl = $("#reader_text");
    const indicator = $("#page_indicator");

    if (!page) {
      if (textEl) textEl.textContent = "";
      if (imgEl)  imgEl.setAttribute("hidden", "hidden");
      if (indicator) indicator.textContent = "0/0";
      return;
    }

    // Ảnh theo ngôn ngữ (tên key theo JSON của bạn)
    const imgUrl =
      (state.currentLang === "en" ? page.L_image_en : page.L_image_vi) ||
      page.L_image_vi || page.L_image_en || "";

    if (imgEl && imgUrl) {
      setImageWithFallback(imgEl, imgUrl);
    } else if (imgEl) {
      imgEl.removeAttribute("src");
      imgEl.setAttribute("hidden", "hidden");
    }

    // Text theo ngôn ngữ
    const text =
      (state.currentLang === "en" ? page.noidung_en : page.noidung_vi) ||
      page.noidung_vi || page.noidung_en || "";
    if (textEl) textEl.textContent = text;

    // Chỉ số trang
    const total = state.currentBook?.pages?.length || 0;
    if (indicator) indicator.textContent = `${state.currentIndex + 1}/${total}`;
  }

  function updateLangButtons() {
    $$(".lang").forEach(b => b.classList.toggle("active", b.dataset.lang === state.currentLang));
  }

  function goto(delta) {
    if (!state.currentBook || !Array.isArray(state.currentBook.pages)) return;
    const total = state.currentBook.pages.length;
    let next = state.currentIndex + delta;
    next = Math.max(0, Math.min(total - 1, next));
    if (next !== state.currentIndex) {
      state.currentIndex = next;
      renderReaderPage();
    }
  }

  function setLang(lang) {
    if (lang !== "vi" && lang !== "en") return;
    if (state.currentLang !== lang) {
      state.currentLang = lang;
      updateLangButtons();
      renderReaderPage();
    }
  }

  /* =========================================================
   * [6] Gắn event cho Reader — KHÔNG ĐỔI
   * ========================================================= */
  function bindReaderEvents(root) {
    $("#btn_prev", root)?.addEventListener("click", () => goto(-1));
    $("#btn_next", root)?.addEventListener("click", () => goto(+1));
    $("#btn_vi",   root)?.addEventListener("click", () => setLang("vi"));
    $("#btn_en",   root)?.addEventListener("click", () => setLang("en"));

    // TTS là optional, hiện tại chỉ toggle class để sau này bạn gắn TTS riêng
    $("#btn_tts",  root)?.addEventListener("click", (e) => {
      e.currentTarget.classList.toggle("active");
      // TODO: gắn Web Speech / Howler… tuỳ bạn
    });

    // Close: chỉ clear nội dung, giữ panel
    $("#btn_close", root)?.addEventListener("click", () => {
      state.currentBook  = null;
      state.currentIndex = 0;
      $("#reader_title").textContent = "NiNi";
      $("#reader_img")?.setAttribute("hidden", "hidden");
      $("#reader_text").textContent = "";
      $("#page_indicator").textContent = "0/0";
    });
  }

  /* =========================================================
   * [7] Mount: render layout + load manifest + list
   * ========================================================= */
  async function mount() {
    const root = $("#stage");
    if (!root) return;

    // 1) Render skeleton layout
    root.innerHTML = layoutHTML();

    // 2) Bind reader events (prev/next/lang/tts/close)
    bindReaderEvents(root);

    // 3) Load manifest & render danh sách
    try {
      state.manifest = await getJSON(PATHS.manifest);
      const books = state.manifest?.books || [];
      renderList(root, books);
    } catch (err) {
      console.error("Load manifest fail:", err);
      $("#sb_list")?.insertAdjacentHTML(
        "beforeend",
        `<div class="empty">Không tải được danh sách sách. Vui lòng kiểm tra đường dẫn manifest.</div>`
      );
    }
  }

  // Khởi động khi DOM sẵn sàng (tránh đụng các script khác)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  } else {
    mount();
  }

  // Debug (tuỳ chọn)
  window.NSTAGE = { state, openBook, renderReaderPage };
})();
