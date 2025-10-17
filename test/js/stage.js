/* =========================================================
   NiNi — stage.js (FULL)
   3 cột: Sidebar (icon) | Storybook (giữa) | Reader (phải)
   - Sidebar: chỉ icon, hover hiện label (CSS bạn đã có)
   - Storybook: đọc /public/content/storybook/library-manifest.json
   - Reader: đọc /public/content/storybook/<ID>.json
   - Ảnh trang: hỗ trợ khóa L_image_pr + fallback URL (có/không /public)
   ========================================================= */
(() => {
  const N = window.NINI || {};

  /* ---------------------------------------------
   * [A] Khung Reader bên phải (HTML shell)
   * Ảnh + nội dung sẽ do bindReaderBehavior nạp động
   * --------------------------------------------- */
  function readerShellHTML(meta){
    return `
      <section class="panel glass story-reader" tabindex="0" aria-label="Story Reader">
        <div class="panel-head">
          <h2>${meta.title_vi || meta.title_en || "Truyện"}</h2>
          <div class="reader-controls">
            <button class="btn small lang ${meta.default_lang==='vi'?'active':''}" data-lang="vi" title="Tiếng Việt">VI</button>
            <button class="btn small lang ${meta.default_lang==='en'?'active':''}" data-lang="en" title="English">EN</button>
            <button class="btn small audio" title="Phát/Dừng âm thanh">🔊</button>
            <button class="btn small reader-close" title="Đóng">Đóng ›</button>
          </div>
        </div>

        <div class="reader-stage">
          <div class="reader-image">
            <!-- 👉 GIỮ thẻ img này. Ảnh sẽ được gán bằng JS -->
            <img id="reader_img" alt="${meta.title_vi || meta.title_en || ''}">
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
   * [B] Nạp nội dung + xử lý Reader
   *  - Tự bắt đúng khóa ảnh L_image_pr
   *  - Fallback URL (có/không /public, tuyệt đối theo origin)
   * ------------------------------------------------------- */
  function bindReaderBehavior(holder, meta, bookData){
    const state = {
      idx: 0,
      lang: meta.default_lang || "vi",
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
    const btnClose= holder.querySelector(".reader-close");

    const clampIdx = i => Math.min(Math.max(i, 0), Math.max(0, state.pages.length - 1));
    const pg = () => state.pages[state.idx] || {};
    const pick = (obj, keys) => { for (const k of keys) if (obj && obj[k]) return obj[k]; return ""; };

    const textFor = (lang) => pick(pg(), [
      `noidung_${lang}`, `content_${lang}`, `text_${lang}`, "noidung", "content", "text"
    ]);

    const soundFor = (lang) => pick(pg(), [
      `L_sound_${lang}`, `sound_${lang}`, `audio_${lang}`, "L_sound", "sound", "audio"
    ]);

    // 👉 ƯU TIÊN L_image_pr (đúng cấu trúc JSON của bạn)
    // 👉 Lấy candidate URL ảnh cho trang hiện tại, rất “chịu chơi”
// - Ưu tiên: L_image_vi/en  → L_image_pr → image/img (có/không đuôi _vi/_en)
// - Sau đó: quét tất cả keys, gom mọi string trỏ tới *.webp|*.png|*.jpg|*.jpeg|*.gif
function imageCandidatesFor(lang){
  const v = pg();
  if (!v || typeof v !== 'object') return [];

  const prioritized = [
    v[`L_image_${lang}`], v[`image_${lang}`], v[`img_${lang}`],
    v[`L_image_${lang === "vi" ? "en" : "vi"}`], v[`image_${lang === "vi" ? "en" : "vi"}`], v[`img_${lang === "vi" ? "en" : "vi"}`],
    v["L_image_pr"], v["L_image"], v["image"], v["img"]
  ].filter(Boolean);

  // Quét toàn bộ keys xem có chuỗi kết thúc bằng đuôi ảnh hay không
  const extra = Object.values(v).filter(s => {
    return (typeof s === "string") && /\.(webp|png|jpe?g|gif)(\?|$)/i.test(s);
  });

  // Hợp nhất + bỏ trùng
  const seen = new Set();
  return [...prioritized, ...extra].filter(u => (seen.has(u) ? false : (seen.add(u), true)));
}


    // 👉 Thử nhiều biến thể URL; log lỗi; hiện gợi ý kiểm tra khi fail
    function tryLoadImage(urls){
      if (!urls || !urls.length){
        imgEl.removeAttribute("src");
        imgEl.style.display = "none";
        imgEl.parentElement.style.minHeight = "0";
        return;
      }

      const makeVariants = (u) => {
        if (!u) return [];
        const hasLeading = u.startsWith("/");
        const noPublic = u.replace(/^\/public(\/|$)/, "/");
        const withSlash = hasLeading ? u : ("/" + u.replace(/^\.?\//,""));
        const withSlashNoPublic = withSlash.replace(/^\/public(\/|$)/,"/");
        const originAbs = location.origin + withSlash;
        const originAbsNoPublic = location.origin + withSlashNoPublic;
        const bust = v => v + (v.includes("?") ? "&" : "?") + "v=" + Date.now();
        return [u, withSlash, noPublic, withSlashNoPublic, originAbs, originAbsNoPublic]
          .filter(Boolean).map(bust);
      };

      const queue = [];
      urls.forEach(u => queue.push(...makeVariants(u)));

      const seen = new Set();
      const finalQueue = queue.filter(u => (seen.has(u) ? false : (seen.add(u), true)));

      let i = 0;
      imgEl.style.display = "block";
      imgEl.parentElement.style.minHeight = "160px";

      function setErrorUI(last){
        imgEl.removeAttribute("src");
        imgEl.style.display = "none";
        imgEl.parentElement.style.minHeight = "0";
        const holderBox = imgEl.parentElement;
        holderBox.querySelectorAll(".img-error-tip").forEach(n=>n.remove());
        const tip = document.createElement("div");
        tip.className = "img-error-tip";
        tip.style.cssText = "background:rgba(0,0,0,.05);border:1px dashed rgba(0,0,0,.25);padding:8px;border-radius:10px;font:12px/1.4 system-ui;color:#111;";
        tip.innerHTML = `Không tải được ảnh.<br><a href="${last}" target="_blank" rel="noreferrer">Mở thử URL cuối</a>`;
        holderBox.appendChild(tip);
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
      tryLoadImage(imgs);                    // 👉 BẮT BUỘC: nạp ảnh
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

    btnClose.addEventListener("click", ()=>{
      stopAudio();
      const mount = holder.parentElement;
      if (mount) mount.innerHTML = "";
    });

    renderPage();
    holder.focus();
  }

  /* ---------------------------------------------
   * [C] Render TRANG 3 CỘT
   * --------------------------------------------- */
  function renderStage(root){
    root.innerHTML = `
      <div class="nini-layout">
        <!-- Sidebar (icon) -->
        <aside class="nini-side glass">
          <div class="side-icons" id="side_icons"></div>
        </aside>

        <!-- Cột giữa: Storybook -->
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
      <button class="icon-btn" data-key="${i.key}" title="${i.label}">
        <span class="icon"><img src="${i.icon}" alt=""></span>
        <span class="lbl">${i.label}</span>
      </button>
    `).join('');

    // Mặc định mở Storybook
    openLibrary();

    // Click sidebar
    iconsEl.addEventListener('click', e=>{
      const btn = e.target.closest('.icon-btn'); if(!btn) return;
      if (btn.dataset.key === 'storybook') openLibrary();
      // mục khác bạn bổ sung sau
    });

    /* ------------ FUNCTIONS ------------ */

    // [1] Load manifest
    function openLibrary(){
      const manifest = '/public/content/storybook/library-manifest.json'; // 👉 Đúng tên file
      fetch(manifest)
        .then(r => { if(!r.ok) throw new Error(r.status); return r.json(); })
        .then(data => renderLibraryList(data.books || []))
        .catch(err => {
          console.error("[Library] manifest error:", err);
          root.querySelector('#lib_list').innerHTML = `
            <div class="sb-card">Không tải được danh sách truyện.<br>
              <small>Kiểm tra đường dẫn: <code>${manifest}</code></small>
            </div>`;
        });
    }

    // [2] Vẽ danh sách sách
    function renderLibraryList(books){
      const list = root.querySelector('#lib_list');
      if (!books.length){
        list.innerHTML = `<div class="sb-card">Chưa có truyện.</div>`;
        return;
      }
      list.innerHTML = books.map(b=>`
        <article class="lib-card" data-id="${b.id}">
          <div class="lib-cover"><img src="${b.cover}" alt=""></div>
          <div>
            <h4 class="lib-title">${b.title_vi || b.title_en || 'No title'}</h4>
            <p class="lib-author">Tác giả: ${b.author || 'N/A'}</p>
          </div>
        </article>
      `).join('');

      list.onclick = (ev)=>{
        const card = ev.target.closest('.lib-card'); if(!card) return;
        openReader(card.dataset.id);
      };
    }

    // [3] Mở 1 cuốn ở cột phải
    function openReader(bookId){
      const url = `/public/content/storybook/${bookId}.json`;
      fetch(url)
        .then(r => { if(!r.ok) throw new Error(r.status); return r.json(); })
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
        .catch(err=>{
          console.error("[Reader] open error:", err);
          root.querySelector('#reader_mount').innerHTML = `
            <div class="panel glass">Không tải được truyện <code>${bookId}</code>.<br>
            <small>Kiểm tra đường dẫn: <code>${url}</code></small></div>`;
        });
    }
  }

  /* ---------------------------------------------
   * [D] Mount
   * --------------------------------------------- */
  if (N.mountOnce){
    N.mountOnce('#stage', renderStage);
  } else {
    const root = document.querySelector('#stage');
    if (root) renderStage(root);
  }

  // (tuỳ chọn) bộ đổi mùa
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

