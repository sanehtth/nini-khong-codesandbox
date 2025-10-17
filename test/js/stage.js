(() => {
  const N = window.NINI || { mountOnce: (sel, fn) => fn(document.querySelector(sel)) };

  /* =========================================================
   * 0) STATE & CONSTS
   * ======================================================= */
  const PATHS = {
    manifest: '/public/content/storybook/library-manifest.json',   // danh mục truyện
    book: (id) => `/public/content/storybook/${id}.json`,          // nội dung 1 truyện
  };

  const STATE = {
    lang: 'vi',         // 'vi' | 'en'
    books: [],          // manifest.books[]
    currentBook: null,  // dữ liệu B00X.json
    pageIndex: 0,       // 0..pages-1
    audio: null,        // Audio instance
  };
  // ----- END STATE & CONSTS -----


  /* =========================================================
   * 1) HTML HELPERS (TEMPLATE STRINGS)
   * ======================================================= */

  // 1.1) Layout tổng: Sidebar | Middle | Main(Reader)
  function layoutHTML() {
    return `
      <div class="nini-layout">
        <!-- ============ Sidebar (chỉ icon) ============ -->
        <aside class="nini-side glass">
          <div class="side-icons" id="side_icons">
            ${sideItem('storybook', '/public/assets/icons/book.webp', 'Storybook', '#/home')}
            ${sideItem('video',     '/public/assets/icons/video.webp', 'Video',     '#/video')}
            ${sideItem('game',      '/public/assets/icons/game.webp',  'Game',      '#/game')}
            ${sideItem('shop',      '/public/assets/icons/shop.webp',  'Shop',      '#/shop')}
            ${sideItem('note',      '/public/assets/icons/note.webp',  'Thông báo', '#/notify')}
            ${sideItem('chat',      '/public/assets/icons/chat.webp',  'Chat',      '#/chat')}
            ${sideItem('setting',   '/public/assets/icons/setting.webp','Cài đặt',  '#/settings')}
            ${sideItem('user',      '/public/assets/icons/user.webp',  'Cá nhân',   '#/profile')}
          </div>
        </aside>
        <!-- ===== END Sidebar ===== -->

        <!-- ============ Middle: Storybook list ============ -->
        <section class="nini-middle">
          <section class="panel glass storybook">
            <div class="sb-head">📚 <strong>Storybook</strong></div>
            <div id="story_list" class="lib-grid">
              <!-- danh sách truyện sẽ render sau khi load manifest -->
              <div class="lib-card" style="opacity:.7">Nhấn biểu tượng <b>Storybook</b> ở thanh bên để tải danh sách…</div>
            </div>
          </section>
        </section>
        <!-- ===== END Middle ===== -->

        <!-- ============ Main: Reader (cột phải) ============ -->
        <main class="nini-main">
          <section id="reader_holder"></section>
        </main>
        <!-- ===== END Main ===== -->
      </div>
    `;
  }
  // ----- END layoutHTML -----


  // 1.2) 1 item icon ở sidebar (có tooltip label)
  function sideItem(key, icon, label, href) {
    return `
      <a href="${href}" class="icon-btn" data-key="${key}" aria-label="${label}" title="${label}">
        <span class="icon"><img src="${icon}" alt="" width="28" height="28" loading="lazy"
              onerror="this.onerror=null;this.src='${icon.replace('.webp','.png')}'" /></span>
        <span class="lbl">${label}</span>
      </a>
    `;
  }
  // ----- END sideItem -----


  // 1.3) List truyện cho cột giữa
  function storyListHTML(books) {
    if (!books?.length) {
      return `<div class="lib-card">Chưa có truyện nào.</div>`;
    }
    return books.map(b => `
      <article class="lib-card" data-bookid="${b.id}">
        <div class="lib-cover">
          <img src="${b.cover}" alt="" loading="lazy"
               onerror="this.onerror=null;this.src='${(b.cover||'').replace('.webp','.png')}'" />
        </div>
        <div>
          <h4 class="lib-title">${b.title_vi}</h4>
          <p class="lib-author">Tác giả: ${b.author || '—'}</p>
        </div>
      </article>
    `).join('');
  }
  // ----- END storyListHTML -----


  // 1.4) Khung Reader (cột phải)
  function readerShellHTML(meta) {
    return `
      <section class="panel glass story-reader">
        <div class="panel-head">
          <h2 style="margin:0">${meta.title_vi}</h2>
          <div class="reader-controls">
            <button class="btn small lang" data-lang="vi"  aria-pressed="${STATE.lang==='vi'}">VI</button>
            <button class="btn small lang" data-lang="en"  aria-pressed="${STATE.lang==='en'}">EN</button>
            <button class="btn small" id="btn_audio" title="Phát/Dừng âm thanh">🔈</button>
            <button class="btn small seeall reader-close" id="btn_close" title="Đóng">Đóng</button>
          </div>
        </div>

        <div class="reader-stage">
          <div class="reader-image reader-frame">
            <img id="reader_img" alt="${meta.title_vi}" />
          </div>

          <div class="reader-text" id="reader_text"></div>

          <div class="reader-nav">
            <button class="btn small" id="btn_prev">‹ Trang trước</button>
            <div class="page-indicator" id="reader_page">1/1</div>
            <button class="btn small" id="btn_next">Trang sau ›</button>
          </div>
        </div>
      </section>
    `;
  }
  // ----- END readerShellHTML -----


  /* =========================================================
   * 2) DATA HELPERS (fetch JSON + fallback)
   * ======================================================= */

  async function fetchJSON(url) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
      return await res.json();
    } catch (e) {
      console.error('fetchJSON error:', url, e);
      return null;
    }
  }
  // ----- END fetchJSON -----


  /* =========================================================
   * 3) RENDERERS & BINDERS
   * ======================================================= */

  // 3.1) Render toàn trang (layout) + bind các sự kiện sidebar
 function renderStage(root) {
  root.innerHTML = layoutHTML();

  // 👉 Thêm dòng này để tự tải danh sách Storybook khi vào trang
  loadLibraryAndRenderList(root);

  const bar = root.querySelector('#side_icons');
  bar.addEventListener('click', async (e) => {
    const a = e.target.closest('.icon-btn');
    if (!a) return;
    const key = a.dataset.key;
    if (key === 'storybook') {
      await loadLibraryAndRenderList(root);
    }
    e.preventDefault();
  });

    // Nếu muốn tự động tải Storybook khi vào trang: bật dòng dưới
    // loadLibraryAndRenderList(root);
  }
  // ----- END renderStage -----


  // 3.2) Load manifest & render list vào cột giữa
  async function loadLibraryAndRenderList(root) {
    const listEl = root.querySelector('#story_list');
    listEl.innerHTML = `<div class="lib-card" style="opacity:.7">Đang tải thư viện…</div>`;

    const data = await fetchJSON(PATHS.manifest);
    if (!data?.books?.length) {
      listEl.innerHTML = `<div class="lib-card">Không đọc được thư viện.</div>`;
      return;
    }

    STATE.books = data.books;
    listEl.innerHTML = storyListHTML(STATE.books);

    // Click 1 truyện để mở Reader
    listEl.addEventListener('click', async (e) => {
      const card = e.target.closest('[data-bookid]');
      if (!card) return;
      const id = card.dataset.bookid;
      await openBook(root, id);
    }, { once: true }); // bind một lần, danh sách không quá lớn
  }
  // ----- END loadLibraryAndRenderList -----


  // 3.3) Mở 1 cuốn truyện → render Reader + bind điều khiển
  async function openBook(root, bookId) {
    const holder = root.querySelector('#reader_holder');
    holder.innerHTML = `<section class="panel glass"><div>Đang tải nội dung…</div></section>`;

    const bookData = await fetchJSON(PATHS.book(bookId));
    if (!bookData?.pages?.length) {
      holder.innerHTML = `<section class="panel glass"><div>Không đọc được nội dung truyện.</div></section>`;
      return;
    }

    STATE.currentBook = bookData;
    STATE.pageIndex = 0;

    // Hiển thị khung Reader
    holder.innerHTML = readerShellHTML(bookData);
    bindReaderBehavior(holder, bookData);
    renderPage(holder);  // hiển thị trang đầu
  }
  // ----- END openBook -----


  // 3.4) Gắn sự kiện cho Reader (ngôn ngữ, audio, prev/next, đóng)
  function bindReaderBehavior(holder, bookData) {
    // Ngôn ngữ
    const langBtns = holder.querySelectorAll('.btn.small.lang');
    langBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        STATE.lang = btn.dataset.lang;
        langBtns.forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
        renderPage(holder);
      });
    });

    // Prev / Next
    holder.querySelector('#btn_prev').addEventListener('click', () => {
      if (STATE.pageIndex > 0) {
        STATE.pageIndex--;
        renderPage(holder);
      }
    });
    holder.querySelector('#btn_next').addEventListener('click', () => {
      const total = STATE.currentBook.pages.length;
      if (STATE.pageIndex < total - 1) {
        STATE.pageIndex++;
        renderPage(holder);
      }
    });

    // Audio
    holder.querySelector('#btn_audio').addEventListener('click', () => {
      toggleAudioForCurrentPage();
    });

    // Đóng Reader
    holder.querySelector('#btn_close').addEventListener('click', () => {
      stopAudio();
      holder.innerHTML = ''; // ẩn khung reader
    });
  }
  // ----- END bindReaderBehavior -----


  // 3.5) Render 1 trang của Reader theo STATE.pageIndex & STATE.lang
  function renderPage(holder) {
    const { currentBook, pageIndex, lang } = STATE;
    const page = currentBook.pages[pageIndex];

    const img = holder.querySelector('#reader_img');
    const text = holder.querySelector('#reader_text');
    const ind = holder.querySelector('#reader_page');

    // ảnh theo ngôn ngữ (ưu tiên VI, nếu không có thì dùng EN)
    const imgSrc = (lang === 'vi' ? page.L_image_vi : page.L_image_en) || page.L_image_vi || page.L_image_en || '';
    img.src = imgSrc;
    img.loading = 'lazy';
    img.onerror = function () {
      this.onerror = null;
      if (this.src.endsWith('.webp')) this.src = this.src.replace('.webp', '.png');
    };

    // nội dung
    const t = (lang === 'vi' ? page.noidung_vi : page.noidung_en) || '';
    text.textContent = t;

    // chỉ số trang
    ind.textContent = `${pageIndex + 1}/${currentBook.pages.length}`;

    // nếu đang phát audio → chuyển sang audio của trang mới
    if (STATE.audio && !STATE.audio.paused) {
      startAudioForPage(page);
    }
  }
  // ----- END renderPage -----


  /* =========================================================
   * 4) AUDIO HELPERS
   * ======================================================= */

  function stopAudio() {
    if (STATE.audio) {
      STATE.audio.pause();
      STATE.audio.currentTime = 0;
    }
  }

  function startAudioForPage(page) {
    stopAudio();
    const src = (STATE.lang === 'vi' ? page.L_sound_vi : page.L_sound_en) || page.L_sound_vi || page.L_sound_en;
    if (!src) return;

    const a = STATE.audio = new Audio(src);
    a.play().catch(() => {/* autoplay bị chặn thì bỏ qua */});
  }

  function toggleAudioForCurrentPage() {
    const page = STATE.currentBook?.pages?.[STATE.pageIndex];
    if (!page) return;

    // Nếu đã có audio và đang phát → pause
    if (STATE.audio && !STATE.audio.paused) {
      STATE.audio.pause();
      return;
    }
    // Nếu chưa có / đã pause → phát lại audio của trang hiện tại
    startAudioForPage(page);
  }
  // ----- END AUDIO HELPERS -----


  /* =========================================================
   * 5) MOUNT
   * ======================================================= */
  N.mountOnce('#stage', renderStage);
  // ----- END MOUNT -----
})();

