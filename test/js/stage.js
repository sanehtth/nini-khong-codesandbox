/* =========================================================
   NiNi — stage.js (full)
   3 cột: Sidebar (icon) | Storybook (giữa) | Reader (phải)
   - Sidebar: chỉ icon, hover hiện label.
   - Storybook: lấy /public/content/storybook/library-manifest.json
   - Reader: lấy /public/content/storybook/<ID>.json
   - Ảnh trang: tự dò nhiều khóa (ưu tiên L_image_pr) và tự fallback URL
   ========================================================= */
(() => {
  const N = window.NINI || {};

  /* ---------------------------------------------
   *  [A] SHELL CHO READER Ở CỘT PHẢI
   *  (Tạo khung; ảnh + text được nạp bởi bindReaderBehavior)
   * --------------------------------------------- */
  function readerShellHTML(meta){
    return `
      <section class="panel glass story-reader" tabindex="0">
        <div class="panel-head">
          <h2>${meta.title_vi || meta.title_en || "Truyện"}</h2>
          <div class="reader-controls">
            <button class="btn small lang ${meta.default_lang==='vi'?'active':''}" data-lang="vi">VI</button>
            <button class="btn small lang ${meta.default_lang==='en'?'active':''}" data-lang="en">EN</button>
            <button class="btn small audio" title="Phát/Dừng âm thanh">🔊</button>
            <button class="btn small reader-close" title="Đóng">Đóng ›</button>
          </div>
        </div>

        <div class="reader-stage">
          <div class="reader-image">
            <img id="reader_img" alt="${meta.title_vi || ''}">
          </div>
          <div class="reader-text" id="reader_text"></div>
        </div>

        <div class="reader-nav">
          <button class="btn small prev">‹ Trang trước</button>
          <div class="page-indicator" id="reader_page">1/1</div>
          <button class="btn small next">Trang sau ›</button>
        </div>
      </section>
    `;
  }

  /* -------------------------------------------------------
   *  [B] BẮT SỰ KIỆN + NẠP NỘI DUNG CHO READER
   *  - Quan trọng: hỗ trợ khóa ảnh L_image_pr trong JSON
   *  - Tự thử URL: giữ /public → bỏ /public → tuyệt đối theo origin
   * ------------------------------------------------------- */
  // ---- Thử nạp ảnh với nhiều biến thể đường dẫn, có hiển thị lỗi hữu ích

   function tryLoadImage(urls){
       if (!urls || !urls.length){
    imgEl.removeAttribute("src");
    imgEl.style.display = "none";
    imgEl.parentElement.style.minHeight = "0";
       return;
  }

  // chuẩn hoá 1 URL → sinh các biến thể
  const makeVariants = (u) => {
    if (!u) return [];
    const hasLeading = u.startsWith("/");
    const noPublic = u.replace(/^\/public(\/|$)/, "/");
    const withSlash = hasLeading ? u : "/"+u.replace(/^\.?\//,"");
    const withSlashNoPublic = withSlash.replace(/^\/public(\/|$)/,"/");
    const originAbs = location.origin + withSlash;
    const originAbsNoPublic = location.origin + withSlashNoPublic;

    // bust cache để tránh CDN giữ 404 cũ
    const bust = v => v + (v.includes("?") ? "&" : "?") + "v=" + Date.now();

    return [
      u, withSlash, noPublic, withSlashNoPublic,
      originAbs, originAbsNoPublic
    ].filter(Boolean).map(bust);
  };

  // danh sách biến thể cho tất cả URL đầu vào
  const queue = [];
  urls.forEach(u => queue.push(...makeVariants(u)));

  // xoá trùng để thử mỗi URL 1 lần
  const seen = new Set();
  const finalQueue = queue.filter(u => (seen.has(u) ? false : (seen.add(u), true)));

  let i = 0;
  imgEl.style.display = "block";
  imgEl.parentElement.style.minHeight = "160px";      // để khung không xẹp khi đang thử

  function setErrorUI(last){
    imgEl.removeAttribute("src");
    imgEl.style.display = "none";
    imgEl.parentElement.style.minHeight = "0";
    // Hiện khung nhỏ báo lỗi + link kiểm tra nhanh
    const err = document.createElement("div");
    err.style.cssText = "background:rgba(0,0,0,.05);border:1px dashed rgba(0,0,0,.25);padding:8px;border-radius:10px;font:12px/1.4 system-ui;color:#111;";
    err.innerHTML = `Không tải được ảnh.<br><a href="${last}" target="_blank" rel="noreferrer">Mở thử URL cuối</a>`;
    const holder = imgEl.parentElement;
    // xoá thông báo cũ nếu có
    holder.querySelectorAll(".img-error-tip").forEach(n=>n.remove());
    err.className = "img-error-tip";
    holder.appendChild(err);
  }

  imgEl.onerror = () => {
    if (i >= finalQueue.length){
      console.error("[Reader] Image failed. Tried:", finalQueue);
      setErrorUI(finalQueue[finalQueue.length-1] || "");
      return;
    }
    const next = finalQueue[i++];
    console.warn("[Reader] retry image:", next);
    imgEl.src = next;
  };

  // bắt đầu thử
  i = 1;
  imgEl.src = finalQueue[0];
}


    function stopAudio(){
      if (state.audio){
        state.audio.pause();
        state.audio.currentTime = 0;
        state.audio = null;
      }
    }

    function renderPage(){
      const imgs = imageCandidatesFor(state.lang);
      tryLoadImage(imgs);
      textEl.textContent = textFor(state.lang) || "";
      pageEl.textContent = `${state.idx+1}/${Math.max(1,state.pages.length)}`;
      btnLangs.forEach(b => b.classList.toggle("active", b.dataset.lang === state.lang));
      btnPrev.disabled = (state.idx === 0);
      btnNext.disabled = (state.idx >= state.pages.length - 1);
    }

    // Events
    btnPrev.addEventListener("click", ()=>{ stopAudio(); state.idx = clampIdx(state.idx - 1); renderPage(); });
    btnNext.addEventListener("click", ()=>{ stopAudio(); state.idx = clampIdx(state.idx + 1); renderPage(); });

    btnLangs.forEach(b=>{
      b.addEventListener("click", ()=>{
        stopAudio();
        state.lang = (b.dataset.lang === "en") ? "en" : "vi";
        renderPage();
      });
    });

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

    // Đóng reader (xóa nội dung cột phải)
    btnClose.addEventListener("click", ()=>{
      stopAudio();
      const mount = holder.parentElement;
      if (mount) mount.innerHTML = "";
    });

    // Default ngôn ngữ
    if (meta.default_lang === "en") state.lang = "en";
    renderPage();
    holder.focus();
  }

  /* ---------------------------------------------
   *  [C] RENDER TRANG (3 cột)
   * --------------------------------------------- */
  function renderStage(root){
    root.innerHTML = `
      <div class="nini-layout">
        <!-- Sidebar (icon) -->
        <aside class="nini-side glass">
          <div class="side-icons" id="side_icons"></div>
        </aside>

        <!-- Cột giữa: Storybook list -->
        <section class="nini-middle">
          <section id="lib_panel" class="panel glass storybook">
            <div class="sb-head">📚 Storybook</div>
            <div id="lib_list" class="lib-grid"></div>
          </section>
        </section>

        <!-- Cột phải: Reader -->
        <main class="nini-main">
          <div id="reader_mount"></div>
        </main>
      </div>
    `;

    // Sidebar icons
    const SIDE_ITEMS = [
      {key:"storybook", label:"Storybook", icon:"/public/assets/icons/book.webp"},
      {key:"video",     label:"Video",     icon:"/public/assets/icons/video.webp"},
      {key:"game",      label:"Game",      icon:"/public/assets/icons/game.webp"},
      {key:"shop",      label:"Shop",      icon:"/public/assets/icons/shop.webp"},
      {key:"note",      label:"Thông báo", icon:"/public/assets/icons/note.webp"},
      {key:"chat",      label:"Chat",      icon:"/public/assets/icons/chat.webp"},
      {key:"setting",   label:"Cài đặt",   icon:"/public/assets/icons/setting.webp"},
      {key:"user",      label:"Cá nhân",   icon:"/public/assets/icons/user.webp"},
    ];

    const iconsEl = root.querySelector('#side_icons');
    iconsEl.innerHTML = SIDE_ITEMS.map(i=>`
      <button class="icon-btn" data-key="${i.key}">
        <span class="icon"><img src="${i.icon}" alt=""></span>
        <span class="lbl">${i.label}</span>
      </button>
    `).join('');

    // mặc định mở Storybook
    openLibrary();

    // Click sidebar
    iconsEl.addEventListener('click', e=>{
      const btn = e.target.closest('.icon-btn'); if(!btn) return;
      if (btn.dataset.key === 'storybook') openLibrary();
      // Các mục khác (video/game/...) bạn thêm sau nếu cần
    });

    /* ------------ functions ------------ */

    // [1] Tải danh sách sách
    function openLibrary(){
      const manifest = '/public/content/storybook/library-manifest.json';
      fetch(manifest)
        .then(r=>r.json())
        .then(data => renderLibraryList(data.books || []))
        .catch(()=> { root.querySelector('#lib_list').innerHTML = '<div>Lỗi tải thư viện</div>'; });
    }

    // [2] Vẽ danh sách sách ở cột giữa
    function renderLibraryList(books){
      const list = root.querySelector('#lib_list');
      list.innerHTML = books.map(b=>`
        <article class="lib-card" data-id="${b.id}">
          <div class="lib-cover"><img src="${b.cover}" alt=""></div>
          <div>
            <h4 class="lib-title">${b.title_vi || b.title_en || 'No title'}</h4>
            <p class="lib-author">Tác giả: ${b.author || 'N/A'}</p>
          </div>
        </article>
      `).join('');

      // Click 1 cuốn để mở reader ở cột phải
      list.addEventListener('click', onPickBook);
    }

    function onPickBook(ev){
      const card = ev.target.closest('.lib-card'); if(!card) return;
      openReader(card.dataset.id);
    }

    // [3] Mở reader (cột phải)
    function openReader(bookId){
      const url = `/public/content/storybook/${bookId}.json`;
      fetch(url)
        .then(r=>r.json())
        .then(bookData=>{
          const mount = root.querySelector('#reader_mount');
          mount.innerHTML = readerShellHTML({
            title_vi: bookData.title_vi || 'Truyện',
            title_en: bookData.title_en || '',
            default_lang: 'vi'
          });
          bindReaderBehavior(mount, {title_vi: bookData.title_vi, default_lang:'vi'}, bookData);
          mount.scrollIntoView({behavior:'smooth', block:'start'});
        })
        .catch(()=> {
          root.querySelector('#reader_mount').innerHTML = '<div class="panel glass">Không tải được truyện.</div>';
        });
    }
  }

  /* ---------------------------------------------
   *  [D] MOUNT
   * --------------------------------------------- */
  if (N.mountOnce){
    N.mountOnce('#stage', renderStage);
  } else {
    // fallback nếu không có NINI helper
    const root = document.querySelector('#stage');
    if (root) renderStage(root);
  }

  // Tuỳ bạn: nếu vẫn muốn giữ bộ chuyển mùa
  function renderSeasonsNav(nav){
    nav.innerHTML = `
      <button data-season="spring">Xuân</button>
      <button data-season="summer">Hạ</button>
      <button data-season="autumn">Thu</button>
      <button data-season="winter">Đông</button>
    `;
    nav.addEventListener('click', (e)=>{
      const btn = e.target.closest('[data-season]');
      if (!btn || !N.setSeason) return;
      N.setSeason(btn.dataset.season);
    });
  }
  if (N.mountOnce) N.mountOnce('#season_nav', renderSeasonsNav);
})();

