/* =========================================================================
   NiNi — stage.js
   Mô-đun dựng layout 3 cột + Storybook Library + Reader.
   Không phụ thuộc lib ngoài; chỉ dùng fetch + DOM.
   ========================================================================= */

(function () {
  // ──────────────────────────────────────────────────────────────────────────
  // 0) Chắn chạy đúp (nếu script vô tình gắn 2 lần)
  // ──────────────────────────────────────────────────────────────────────────
  if (window.__NINI_STAGE_INIT__) return;
  window.__NINI_STAGE_INIT__ = true;

  // ──────────────────────────────────────────────────────────────────────────
  // 1) Helpers nhỏ
  // ──────────────────────────────────────────────────────────────────────────
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const h  = (html) => {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  };

  // Join path an toàn (tránh “//”)
  const join = (...parts) =>
    parts
      .map((p, i) => (i === 0 ? String(p || '') : String(p || '').replace(/^\/+/, '')))
      .join('/')
      .replace(/([^:])\/{2,}/g, '$1/');

  // Đường dẫn nội dung
  const CONTENT_ROOT = '/public/content/storybook';

  // Trạng thái module
  const State = {
    books: [],       // từ library-manifest.json
    current: null,   // meta cuốn đang đọc
    data: null,      // JSON nội dung cuốn (pages[])
    index: 0,        // trang hiện tại
    lang: 'vi',      // 'vi' | 'en'
    mounted: false,  // đã render stage layout chưa
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 2) Sidebar items (tối giản – chỉ bật Storybook)
  // ──────────────────────────────────────────────────────────────────────────
  const SIDE_ITEMS = [
    { key: 'storybook', label: 'Storybook', icon: '/public/assets/icons/book.webp' },
    { key: 'video',     label: 'Video',      icon: '/public/assets/icons/video.webp' },
    { key: 'game',      label: 'Game',       icon: '/public/assets/icons/game.webp' },
    { key: 'shop',      label: 'Shop',       icon: '/public/assets/icons/store.webp' },
    { key: 'bell',      label: 'Thông báo',  icon: '/public/assets/icons/bell.webp' },
    { key: 'chat',      label: 'Chat',       icon: '/public/assets/icons/chat.webp' },
    { key: 'settings',  label: 'Cài đặt',    icon: '/public/assets/icons/gear.webp' },
    { key: 'profile',   label: 'Cá nhân',    icon: '/public/assets/icons/user.webp' },
  ];

  // ──────────────────────────────────────────────────────────────────────────
  // 3) HTML blocks
  // ──────────────────────────────────────────────────────────────────────────

  // [A] Shell 3 cột
  function stageShellHTML() {
    const side = SIDE_ITEMS.map((it, i) => {
      return `
        <a class="icon-btn" href="javascript:void(0)" data-key="${it.key}" aria-label="${it.label}">
          <span class="icon">
            <img src="${it.icon}" width="28" height="28" alt="${it.label}"
                 onerror="this.onerror=null;this.src='${it.icon.replace('.webp','.png')}';" />
          </span>
          <span class="lbl">${it.label}</span>
        </a>
      `;
    }).join('');

    return `
      <div class="nini-layout">
        <!-- Cột trái: Sidebar -->
        <aside class="nini-side glass">
          <div class="side-icons">${side}</div>
        </aside>

        <!-- Cột giữa: Storybook Library -->
        <section class="nini-middle">
          <div class="panel glass storybook">
            <div class="sb-head">
              <span style="font-weight:800">📚 Storybook</span>
            </div>
            <div id="lib_list" class="lib-grid"></div>
            <div id="lib_hint" class="muted" style="font-size:13px;display:none">Không có sách...</div>
          </div>
        </section>

        <!-- Cột phải: Reader -->
        <section class="nini-main">
          <div id="reader_holder"></div>
        </section>
      </div>
    `;
  }
  /* --------------------------- HẾT PHẦN [A] ------------------------------ */

  // [B] Card 1 cuốn sách trong danh sách
  function bookCardHTML(b) {
    const cover = join('/', b.cover || '');
    return `
      <article class="lib-card" data-id="${b.id}">
        <div class="lib-cover">
          <img src="${cover}" alt="${b.title_vi || b.title_en || 'Book'}"
               onerror="this.onerror=null;this.src='${cover.replace('.webp','.png')}';" />
        </div>
        <div class="lib-info">
          <h4 class="lib-title">${b.title_vi || b.title_en || 'No title'}</h4>
          <p class="lib-author">Tác giả: ${b.author || '—'}</p>
        </div>
      </article>
    `;
  }
  /* --------------------------- HẾT PHẦN [B] ------------------------------ */

  // [C] Reader shell (khung phải)
  function readerShellHTML(meta) {
    return `
      <div class="panel glass story-reader" id="reader_panel">
        <div class="panel-head">
          <h2 style="margin:0">${meta?.title_vi || meta?.title_en || 'Story'}</h2>
          <div class="reader-controls">
            <button class="btn small" id="btn_lang_vi" data-lang="vi">VI</button>
            <button class="btn small" id="btn_lang_en" data-lang="en">EN</button>
            <button class="btn small" id="btn_close">Đóng</button>
          </div>
        </div>

        <div class="reader-stage">
          <div class="reader-image">
            <img id="reader_img" alt="${meta?.title_vi || 'story'}" />
          </div>
          <div class="reader-text" id="reader_text">...</div>
          <div class="reader-nav">
            <button class="btn small" id="btn_prev">‹ Trang trước</button>
            <div class="page-indicator" id="reader_page">1/1</div>
            <button class="btn small" id="btn_next">Trang sau ›</button>
          </div>
        </div>
      </div>
    `;
  }
  /* --------------------------- HẾT PHẦN [C] ------------------------------ */

  // ──────────────────────────────────────────────────────────────────────────
  // 4) Fetch helpers
  // ──────────────────────────────────────────────────────────────────────────
  async function getJSON(url) {
    const res = await fetch(url, { credentials: 'same-origin' });
    if (!res.ok) throw new Error(`Fetch failed: ${url} (${res.status})`);
    return res.json();
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 5) Library: tải & render danh sách
  // ──────────────────────────────────────────────────────────────────────────
  async function loadLibrary() {
    const listEl = $('#lib_list');
    const hintEl = $('#lib_hint');
    if (!listEl) return;

    listEl.innerHTML = ''; hintEl.style.display = 'none';

    try {
      const manifestUrl = join(CONTENT_ROOT, 'library-manifest.json');
      const json = await getJSON(manifestUrl);
      const books = Array.isArray(json?.books) ? json.books : [];
      State.books = books;

      if (!books.length) {
        hintEl.style.display = 'block';
        return;
      }

      const html = books.map(bookCardHTML).join('');
      listEl.innerHTML = html;

      // Gắn click → openBook
      $$('.lib-card', listEl).forEach(card => {
        card.addEventListener('click', () => {
          const id = card.getAttribute('data-id');
          const meta = books.find(b => String(b.id) === String(id));
          if (meta) openBook(meta);
        });
      });

    } catch (err) {
      console.error('[library] error:', err);
      hintEl.style.display = 'block';
      hintEl.textContent = 'Không tải được danh sách sách.';
    }
  }
  /* --------------------------- HẾT PHẦN LIBRARY -------------------------- */

  // ──────────────────────────────────────────────────────────────────────────
  // 6) Reader: set trang, fallback ảnh, đổi ngôn ngữ, prev/next
  // ──────────────────────────────────────────────────────────────────────────
  function setReaderPage(meta, bookData, pageIndex, lang) {
    const page = bookData?.pages?.[pageIndex];
    const imgEl  = $('#reader_img');
    const textEl = $('#reader_text');
    const indEl  = $('#reader_page');

    if (!page || !imgEl || !textEl || !indEl) return;

    const imgKey  = lang === 'en' ? 'l_image_en'  : 'l_image_vi';
    const textKey = lang === 'en' ? 'noidung_en'  : 'noidung_vi';

    let src = page[imgKey] || page.l_image_vi || page.l_image_en || page.image || '';
    textEl.textContent = page[textKey] || '';

    imgEl.alt = meta?.title_vi || 'story page';
    imgEl.onerror = function () {
      try {
        if (imgEl.src.endsWith('.webp')) {
          imgEl.onerror = null;
          imgEl.src = imgEl.src.replace(/\.webp(\?.*)?$/i, '.png$1');
        }
      } catch(_) {}
    };
    imgEl.src = src || '';

    indEl.textContent = `${pageIndex + 1}/${bookData.pages.length}`;
  }

  function bindReaderBehavior(holder, meta, bookData) {
    State.index = 0;
    State.lang = 'vi';

    const btnVi   = $('#btn_lang_vi', holder);
    const btnEn   = $('#btn_lang_en', holder);
    const btnPrev = $('#btn_prev', holder);
    const btnNext = $('#btn_next', holder);
    const btnClose= $('#btn_close', holder);

    // lần đầu
    setReaderPage(meta, bookData, State.index, State.lang);

    // ngôn ngữ
    btnVi?.addEventListener('click', () => {
      State.lang = 'vi';
      btnVi.classList.add('active');
      btnEn.classList.remove('active');
      setReaderPage(meta, bookData, State.index, State.lang);
    });
    btnEn?.addEventListener('click', () => {
      State.lang = 'en';
      btnEn.classList.add('active');
      btnVi.classList.remove('active');
      setReaderPage(meta, bookData, State.index, State.lang);
    });

    // prev / next
    btnPrev?.addEventListener('click', () => {
      if (State.index > 0) {
        State.index--;
        setReaderPage(meta, bookData, State.index, State.lang);
      }
    });
    btnNext?.addEventListener('click', () => {
      if (State.index < bookData.pages.length - 1) {
        State.index++;
        setReaderPage(meta, bookData, State.index, State.lang);
      }
    });

    // đóng reader
    btnClose?.addEventListener('click', () => {
      $('#reader_holder')?.replaceChildren();
      State.current = null;
      State.data = null;
      State.index = 0;
    });
  }
  /* --------------------------- HẾT PHẦN READER --------------------------- */

  // ──────────────────────────────────────────────────────────────────────────
  // 7) Mở 1 cuốn: render reader + fetch JSON nội dung
  // ──────────────────────────────────────────────────────────────────────────
  async function openBook(meta) {
    const holder = $('#reader_holder');
    if (!holder) return;

    holder.innerHTML = readerShellHTML(meta);

    try {
      // File JSON nội dung: /public/content/storybook/B001.json ...
      const file = `${meta.id}.json`.replace(/\.json$/i, '') + '.json';
      const url = join(CONTENT_ROOT, file);
      const data = await getJSON(url);

      State.current = meta;
      State.data = data;

      bindReaderBehavior(holder, meta, data);
    } catch (err) {
      console.error('[openBook] error:', err);
      $('#reader_text')?.replaceChildren(
        document.createTextNode('Không tải được nội dung truyện.')
      );
    }
  }
  /* --------------------------- HẾT PHẦN OPEN BOOK ------------------------ */

  // ──────────────────────────────────────────────────────────────────────────
  // 8) Render stage vào #stage + gắn sự kiện sidebar
  // ──────────────────────────────────────────────────────────────────────────
  function renderStage(root) {
    if (!root) return;
    root.innerHTML = stageShellHTML();

    // Gắn sự kiện cho sidebar
    $$('.icon-btn[data-key]').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-key');
        // Đánh dấu active (visual tuỳ CSS)
        $$('.icon-btn').forEach(b => b.classList.toggle('active', b === btn));

        if (key === 'storybook') {
          loadLibrary();
        } else {
          // Các mục khác: clear giữa/phải
          $('#lib_list')?.replaceChildren();
          $('#reader_holder')?.replaceChildren();
        }
      });
    });

    // Mặc định mở Storybook lần đầu
    const first = $('.icon-btn[data-key="storybook"]');
    if (first) first.click();
  }
  /* --------------------------- HẾT PHẦN RENDER --------------------------- */

  // ──────────────────────────────────────────────────────────────────────────
  // 9) Khởi động
  // ──────────────────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    const mountPoint = document.getElementById('stage');
    renderStage(mountPoint);
  });
  /* --------------------------- HẾT PHẦN BOOTSTRAP ------------------------ */

})();
