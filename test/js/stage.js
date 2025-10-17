/* =========================================================================
 * stage.js — Trang Home kiểu Canva (JS thuần)
 * Flow:
 *  1) Sidebar chỉ icon
 *  2) Click icon "Storybook" => CỘT GIỮA hiển thị danh sách truyện (cover+title+author)
 *  3) Click tên truyện trong CỘT GIỮA => CỘT PHẢI mở TRÌNH ĐỌC TRUYỆN
 *     - Ảnh trên, nội dung dưới
 *     - Nút Prev/Next, nút loa phát âm thanh, nút ngôn ngữ VI/EN
 *  4) Bỏ panel Shop
 * ========================================================================= */

;(() => {
  const N = window.NINI || {};

  /* -----------------------------------------------------------------------
   * [A] CẤU HÌNH CỐ ĐỊNH
   * --------------------------------------------------------------------- */
  const SIDE_ITEMS = [
    { key: "storybook", label: "Storybook", icon: "/public/assets/icons/book.webp",    href: "#/home"     },
    { key: "video",     label: "Video",     icon: "/public/assets/icons/video.webp",   href: "#/video"    },
    { key: "game",      label: "Game",      icon: "/public/assets/icons/game.webp",    href: "#/game"     },
    { key: "shop",      label: "Shop",      icon: "/public/assets/icons/shop.webp",    href: "#/shop"     },
    { key: "note",      label: "Thông báo", icon: "/public/assets/icons/note.webp",    href: "#/notify"   },
    { key: "chat",      label: "Chat",      icon: "/public/assets/icons/chat.webp",    href: "#/chat"     },
    { key: "setting",   label: "Cài đặt",   icon: "/public/assets/icons/setting.webp", href: "#/settings" },
    { key: "user",      label: "Cá nhân",   icon: "/public/assets/icons/user.webp",    href: "#/profile"  },
  ];

  // URL manifest thư viện + quy tắc url file sách (B001.json, B002.json…)
  const LIB_URL = "/public/content/storybook/library-manifest.json";
  const bookJsonUrl = (id) => `/public/content/storybook/${id}.json`;

  // Demo “Recent designs” ở cột phải
  const RECENTS = [
    {title:"Food & Restaurant FAQs Doc in Green", type:"Doc",    edited:"2 days ago", img:"https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=800&auto=format&fit=crop"},
    {title:"One Pager Doc in Black and White",    type:"Doc",    edited:"2 days ago", img:"https://images.unsplash.com/photo-1486427944299-d1955d23e34d?q=80&w=800&auto=format&fit=crop"},
    {title:"Classroom Fun Poster",                type:"Design", edited:"2 days ago", img:"https://images.unsplash.com/photo-1516387938699-a93567ec168e?q=80&w=800&auto=format&fit=crop"},
  ];

  /* -----------------------------------------------------------------------
   * [B] HELPER
   * --------------------------------------------------------------------- */
  async function fetchJSON(url){
    const res = await fetch(url, { cache: "no-store" });
    if(!res.ok) throw new Error("Fetch failed " + res.status + " @ " + url);
    return await res.json();
  }

  const recentCard = (x) => `
    <article class="card">
      <div class="thumb"><img src="${x.img}" alt=""></div>
      <div class="meta">
        <p class="ttl">${x.title}</p>
        <p class="sub">${x.type} • Edited ${x.edited}</p>
      </div>
    </article>
  `;

  /* -----------------------------------------------------------------------
   * [C] STORYBOOK — LIST (CỘT GIỮA)
   * --------------------------------------------------------------------- */
  function libraryListHTML(books){
    return `
      <section class="panel glass storybook">
        <div class="sb-head">📚 Storybook</div>
        <div class="lib-grid">
          ${books.map(b => `
            <article class="lib-card">
              <div class="lib-cover">
                <img src="${b.cover}" alt="${b.title_vi}" loading="lazy"/>
              </div>
              <div class="lib-meta">
                <!-- Click tiêu đề để mở trình đọc ở CỘT PHẢI -->
                <h4 class="lib-title" data-open="${b.id}" title="${b.title_vi}">
                  ${b.title_vi}
                </h4>
                <p class="lib-author">Tác giả: ${b.author || "—"}</p>
              </div>
            </article>
          `).join("")}
        </div>
      </section>
    `;
  }

  async function loadLibraryIntoMiddle(root){
    const mid = root.querySelector(".nini-middle");
    mid.innerHTML = `<section class="panel glass"><p>Đang tải thư viện…</p></section>`;
    try{
      const data = await fetchJSON(LIB_URL);
      const books = (data && data.books) || [];
      mid.innerHTML = libraryListHTML(books);
      attachLibraryListEvents(root, books);
    }catch(e){
      console.error(e);
      mid.innerHTML = `<section class="panel glass"><p style="color:#b91c1c">Lỗi tải thư viện.</p></section>`;
    }
  }

  function attachLibraryListEvents(root, books){
    const mid = root.querySelector(".nini-middle");
    mid.querySelectorAll('[data-open]').forEach(el=>{
      el.addEventListener("click", ()=>{
        const id = el.getAttribute("data-open");
        const bookMeta = books.find(b => String(b.id) === String(id));
        if(!bookMeta) return;
        openBookReader(root, bookMeta); // mở reader ở CỘT PHẢI
      });
    });
  }

  /* -----------------------------------------------------------------------
   * [D] STORY READER — mở ở CỘT PHẢI
   *  - Ngôn ngữ: vi / en
   *  - Nav: prev/next
   *  - Audio: theo ngôn ngữ
   * --------------------------------------------------------------------- */
  function readerShellHTML(meta){
    return `
      <section class="panel glass story-reader">
        <div class="panel-head">
          <h2>${meta.title_vi}</h2>
          <div class="reader-controls">
            <button class="btn small lang" data-lang="vi">VI</button>
            <button class="btn small lang" data-lang="en">EN</button>
            <button class="btn small audio" title="Phát/Dừng âm thanh">🔊</button>
            <button class="seeall reader-close" title="Đóng">Đóng ›</button>
          </div>
        </div>

        <div class="reader-stage">
          <div class="reader-image">
            <img id="reader_img" alt="${meta.title_vi}" />
          </div>
          <div class="reader-text" id="reader_text"></div>
        </div>

        <div class="reader-nav">
          <button class="btn prev">◀ Trang trước</button>
          <div class="page-indicator" id="reader_page">1/1</div>
          <button class="btn next">Trang sau ▶</button>
        </div>
      </section>
    `;
  }

  function bindReaderBehavior(holder, meta, bookData){
  const state = {
    idx: 0,
    lang: "vi",
    audio: null,
    pages: Array.isArray(bookData.pages) ? bookData.pages : []
  };

  const imgEl   = holder.querySelector("#reader_img");
  const textEl  = holder.querySelector("#reader_text");
  const pageEl  = holder.querySelector("#reader_page");
  const btnPrev = holder.querySelector(".prev");
  const btnNext = holder.querySelector(".next");
  const btnAudio= holder.querySelector(".audio");
  const btnLangs= holder.querySelectorAll(".lang");

  const clampIdx = i => Math.min(Math.max(i, 0), Math.max(0, state.pages.length - 1));
  const pageObj  = () => state.pages[state.idx] || {};

  // ---- NEW: helper dò nhiều biến thể key ----
  const pick = (obj, keys) => {
    for (const k of keys) if (obj && obj[k]) return obj[k];
    return "";
  };
  function imageFor(lang) {
    const p = pageObj();
    const alt = lang === "vi" ? "vn" : "en";
    return pick(p, [
      `L_image_${lang}`, `image_${lang}`, `img_${lang}`,
      `L_image_${alt}`,  `image_${alt}`,  `img_${alt}`, // phòng khi file chỉ có 1 biến thể
      "L_image", "image", "img", "L_image_pr"           // một số tên bạn đang dùng
    ]);
  }
  function soundFor(lang) {
    const p = pageObj();
    const alt = lang === "vi" ? "vn" : "en";
    return pick(p, [
      `L_sound_${lang}`, `sound_${lang}`, `audio_${lang}`,
      `L_sound_${alt}`,  `sound_${alt}`,  `audio_${alt}`,
      "L_sound", "sound", "audio"
    ]);
  }
  function textFor(lang) {
    const p = pageObj();
    const alt = lang === "vi" ? "vn" : "en";
    return pick(p, [
      `noidung_${lang}`, `content_${lang}`, `text_${lang}`,
      `noidung_${alt}`,  `content_${alt}`,  `text_${alt}`,
      "noidung", "content", "text"
    ]);
  }
  // -------------------------------------------

  function stopAudio(){
    if (state.audio){
      state.audio.pause();
      state.audio.currentTime = 0;
      state.audio = null;
    }
  }

  function renderPage(){
    const imgSrc = imageFor(state.lang);
    const text   = textFor(state.lang);

    if (imgSrc) { imgEl.src = imgSrc; imgEl.style.display = "block"; }
    else        { imgEl.removeAttribute("src"); imgEl.style.display = "none"; }

    // Giữ xuống dòng đúng như trong JSON
    textEl.textContent = text || "";

    pageEl.textContent = `${state.idx+1}/${Math.max(1,state.pages.length)}`;
    btnLangs.forEach(b => b.classList.toggle("active", b.dataset.lang === state.lang));
    btnPrev.disabled = (state.idx === 0);
    btnNext.disabled = (state.idx >= state.pages.length - 1);
  }

  // NAV
  btnPrev.addEventListener("click", () => { stopAudio(); state.idx = clampIdx(state.idx - 1); renderPage(); });
  btnNext.addEventListener("click", () => { stopAudio(); state.idx = clampIdx(state.idx + 1); renderPage(); });

  // LANG
  btnLangs.forEach(b=>{
    b.addEventListener("click", ()=>{
      stopAudio();
      state.lang = b.dataset.lang === "en" ? "en" : "vi";
      renderPage();
    });
  });

  // AUDIO
  btnAudio.addEventListener("click", ()=>{
    if (state.audio){ stopAudio(); return; }
    const src = soundFor(state.lang);
    if (!src) return;
    try{
      state.audio = new Audio(src);
      state.audio.addEventListener("ended", ()=>{ state.audio=null; });
      state.audio.play().catch(()=>{ state.audio=null; });
    }catch(e){ state.audio=null; }
  });

  holder.addEventListener("keydown", (ev)=>{
    if (ev.key === "ArrowLeft"){ btnPrev.click(); }
    if (ev.key === "ArrowRight"){ btnNext.click(); }
  });

  renderPage();
  holder.tabIndex = 0;
  holder.focus();
}


  async function openBookReader(root, bookMeta){
    const mainHolder = root.querySelector("#detail-holder");
    mainHolder.innerHTML = `<section class="panel glass"><p>Đang tải truyện…</p></section>`;

    try{
      const data = await fetchJSON(bookJsonUrl(bookMeta.id));
      // vỏ trình đọc
      mainHolder.innerHTML = readerShellHTML(bookMeta);

      // đóng
      const closeBtn = mainHolder.querySelector(".reader-close");
      if (closeBtn) closeBtn.addEventListener("click", ()=> mainHolder.innerHTML = "");

      // gắn behavior
      bindReaderBehavior(mainHolder.querySelector(".story-reader"), bookMeta, data);

      // cuộn tới trình đọc
      mainHolder.scrollIntoView({behavior:"smooth", block:"start"});
    }catch(e){
      console.error(e);
      mainHolder.innerHTML = `<section class="panel glass"><p style="color:#b91c1c">Lỗi tải sách.</p></section>`;
    }
  }

  /* -----------------------------------------------------------------------
   * [E] RENDER TRANG CHÍNH
   * --------------------------------------------------------------------- */
  function renderStage(root) {
    root.innerHTML = `
      <div class="nini-canvas">
        <div class="nini-layout"><!-- 3 cột: Sidebar | Middle | Main -->

          <!-- SIDEBAR ICON -->
          <aside class="nini-side glass">
            <div class="side-icons">
              ${SIDE_ITEMS.map((it,i)=>`
                <a href="${it.href}" class="icon-btn ${i===0?'active':''}"
                   data-key="${it.key}" aria-label="${it.label}" title="${it.label}">
                  <span class="icon"><img src="${it.icon}" alt="${it.label}" loading="lazy" width="28" height="28"/></span>
                  <span class="lbl">${it.label}</span>
                </a>
              `).join("")}
            </div>
          </aside>

          <!-- CỘT GIỮA (nạp Storybook khi bấm icon) -->
          <section class="nini-middle"></section>

          <!-- CỘT PHẢI -->
          <main class="nini-main">
            <!-- Khu đặt TRÌNH ĐỌC TRUYỆN -->
            <div id="detail-holder"></div>

            <!-- Search + Quick + Recent -->
            <section class="panel glass">
              <div class="search">
                <input type="text" placeholder="Mô tả ý tưởng, mình sẽ giúp bạn tạo..." />
                <span class="ico">🔎</span>
              </div>

              <div class="quick">
                ${[
                  "Instagram Post","Sheet","Doc","Whiteboard",
                  "Presentation","Social media","Photo editor","Video"
                ].map(l => `
                  <button class="qa">
                    <span class="qa-ico">🧩</span>
                    <span class="qa-txt">${l}</span>
                  </button>
                `).join("")}
              </div>

              <div class="panel-head">
                <h2>Recent designs</h2>
                <a href="#/designs" class="seeall">Xem tất cả ›</a>
              </div>
              <div id="recent_grid" class="recents"></div>
            </section>

            <!-- Assignments -->
            <section class="panel glass">
              <div class="panel-head">
                <h2>Assignments</h2>
                <a href="#/classwork" class="seeall">Tới Classwork ›</a>
              </div>
              <div class="empty">
                <h3>Thư giãn thôi</h3>
                <p>Khi giáo viên giao bài, bài tập sẽ xuất hiện ở đây và trong thông báo.</p>
              </div>
            </section>
          </main>
        </div>
      </div>
    `;

    // active theo hash
    const cur = (location.hash.split("/")[1] || "home");
    root.querySelectorAll(".icon-btn").forEach(a=>{
      a.classList.toggle("active", a.getAttribute("href").includes(cur));
    });

    // recents
    root.querySelector('#recent_grid').innerHTML = RECENTS.map(recentCard).join('');

    // bấm icon Storybook => nạp list vào CỘT GIỮA
    root.querySelectorAll('.icon-btn[data-key="storybook"]').forEach(btn=>{
      btn.addEventListener('click', ()=> loadLibraryIntoMiddle(root));
    });

    // (tuỳ chọn) tự nạp khi ở /#/home
    if (cur === "home") loadLibraryIntoMiddle(root);
  }

  /* -----------------------------------------------------------------------
   * [F] (Tuỳ chọn) Thanh chọn mùa cũ – giữ tương thích
   * --------------------------------------------------------------------- */
  function renderSeasonsNav(nav){
    nav.innerHTML = `
      <button data-season="spring">Xuân</button>
      <button data-season="summer">Hạ</button>
      <button data-season="autumn">Thu</button>
      <button data-season="winter">Đông</button>
    `;
    nav.addEventListener('click', (e)=>{
      const btn = e.target.closest('[data-season]');
      if (!btn) return;
      if (typeof N.setSeason === 'function') N.setSeason(btn.dataset.season);
    });
  }

  /* -----------------------------------------------------------------------
   * [G] MOUNT
   * --------------------------------------------------------------------- */
  if (typeof N.mountOnce === 'function') {
    N.mountOnce('#stage', renderStage);
    N.mountOnce('#season_nav', renderSeasonsNav);
  } else {
    const stageEl = document.querySelector('#stage');
    if (stageEl) renderStage(stageEl);
    const navEl = document.querySelector('#season_nav');
    if (navEl) renderSeasonsNav(navEl);
  }
})();

