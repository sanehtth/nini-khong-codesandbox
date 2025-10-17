/* =========================================================================
 * stage.js — Trang Home kiểu Canva (JS thuần)
 * Mục tiêu:
 *  1) Sidebar chỉ icon
 *  2) Click icon "Storybook" => CỘT GIỮA hiển thị danh sách truyện (cover+title+author)
 *  3) Click tên truyện trong CỘT GIỮA => CỘT PHẢI hiển thị panel chi tiết
 *  4) Bỏ panel "Shop"
 * ========================================================================= */

;(() => {
  const N = window.NINI || {};

  /* -----------------------------------------------------------------------
   * [A] CẤU HÌNH CỐ ĐỊNH
   * --------------------------------------------------------------------- */
  // Sidebar: icon + label + link (dùng path /public/...)
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

  // Đường dẫn manifest thư viện truyện
  const LIB_URL = "/public/content/storybook/library-manifest.json";

  // Demo data cho “Recent designs” ở cột phải (giữ lại để lấp content)
  const RECENTS = [
    {title:"Food & Restaurant FAQs Doc in Green", type:"Doc",    edited:"2 days ago", img:"https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=800&auto=format&fit=crop"},
    {title:"One Pager Doc in Black and White",    type:"Doc",    edited:"2 days ago", img:"https://images.unsplash.com/photo-1486427944299-d1955d23e34d?q=80&w=800&auto=format&fit=crop"},
    {title:"Classroom Fun Poster",                type:"Design", edited:"2 days ago", img:"https://images.unsplash.com/photo-1516387938699-a93567ec168e?q=80&w=800&auto=format&fit=crop"},
  ];

  /* -----------------------------------------------------------------------
   * [B] HELPER: fetch JSON + template nhỏ
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
   * [C] STORYBOOK UI
   *  - Render danh sách (CỘT GIỮA)
   *  - Render chi tiết (CỘT PHẢI)
   *  - Gắn sự kiện click
   * --------------------------------------------------------------------- */
  // 1) Danh sách thư viện (render ở CỘT GIỮA)
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
                <!-- Nút mở chi tiết: data-open để attach click -->
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

  // 2) Panel chi tiết (render ở CỘT PHẢI – phía trên “Recent designs”)
  function storyDetailHTML(book){
    return `
      <section class="panel glass story-detail">
        <div class="panel-head">
          <h2>${book.title_vi}</h2>
          <button class="seeall sb-close">Đóng ›</button>
        </div>
        <div class="lib-detail">
          <div class="lib-detail-cover">
            <img src="${book.cover}" alt="${book.title_vi}"/>
          </div>
          <div class="lib-detail-info">
            <p><strong>Tác giả:</strong> ${book.author || "—"}</p>
            <p><strong>Thiết kế:</strong> ${book.design || "—"}</p>
            <p><strong>Số trang:</strong> ${book.pages_count ?? "—"}</p>
            <!-- Bạn có thể thêm nút Đọc ở đây nếu có file nội dung từng trang -->
          </div>
        </div>
      </section>
    `;
  }

  // 3) Gắn click vào CỘT GIỮA để đẩy chi tiết sang CỘT PHẢI
  function attachLibraryListEvents(root, books){
    const mainHolder = root.querySelector("#detail-holder"); // CỘT PHẢI – nơi hiển thị chi tiết
    const mid = root.querySelector(".nini-middle");

    mid.querySelectorAll('[data-open]').forEach(el=>{
      el.addEventListener("click", ()=>{
        const id = el.getAttribute("data-open");
        const book = books.find(b => String(b.id) === String(id));
        if(!book) return;

        // Render panel chi tiết ở CỘT PHẢI
        mainHolder.innerHTML = storyDetailHTML(book);

        // Nút Đóng => xóa panel chi tiết
        const closeBtn = mainHolder.querySelector(".sb-close");
        if (closeBtn) closeBtn.addEventListener("click", ()=> mainHolder.innerHTML = "");

        // Cuộn tới khu chi tiết cho người dùng thấy ngay
        mainHolder.scrollIntoView({behavior:"smooth", block:"start"});
      });
    });
  }

  // 4) Tải manifest và render list vào CỘT GIỮA
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

  /* -----------------------------------------------------------------------
   * [D] RENDER TRANG CHÍNH
   * --------------------------------------------------------------------- */
  function renderStage(root) {
    root.innerHTML = `
      <div class="nini-canvas">
        <div class="nini-layout"><!-- 3 cột: Sidebar | Middle | Main -->

          <!-- SIDEBAR ICON (chỉ icon; tooltip/label xử lý bởi CSS bạn đã thêm) -->
          <aside class="nini-side glass">
            <div class="side-icons">
              ${SIDE_ITEMS.map((it,i)=>`
                <a href="${it.href}" class="icon-btn ${i===0?'active':''}"
                   data-key="${it.key}" aria-label="${it.label}" title="${it.label}">
                  <span class="icon"><img src="${it.icon}" alt="${it.label}" loading="lazy" width="28" height="28"/></span>
                  <span class="lbl">${it.label}</span><!-- dùng như tooltip -->
                </a>
              `).join("")}
            </div>
          </aside>

          <!-- CỘT GIỮA (ban đầu rỗng; sẽ nạp Storybook khi bấm icon) -->
          <section class="nini-middle"></section>

          <!-- CỘT PHẢI (MAIN) -->
          <main class="nini-main">

            <!-- Vùng đặt panel chi tiết TRUYỆN -->
            <div id="detail-holder"></div>

            <!-- Panel: Search + Quick Actions + Recent -->
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

            <!-- Panel: Assignments -->
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

    // Active theo hash hiện tại
    const cur = (location.hash.split("/")[1] || "home");
    root.querySelectorAll(".icon-btn").forEach(a=>{
      a.classList.toggle("active", a.getAttribute("href").includes(cur));
    });

    // Render Recents
    const grid = root.querySelector('#recent_grid');
    grid.innerHTML = RECENTS.map(recentCard).join('');

    // Gắn event: click icon Storybook => nạp list vào CỘT GIỮA
    root.querySelectorAll('.icon-btn[data-key="storybook"]').forEach(btn=>{
      btn.addEventListener('click', (e)=>{
        // e.preventDefault(); // bật nếu muốn giữ hash yên
        loadLibraryIntoMiddle(root);
      });
    });

    // (Tuỳ chọn) nếu đang ở /#/home thì tự load list khi vào trang
    if (cur === "home") loadLibraryIntoMiddle(root);
  }

  /* -----------------------------------------------------------------------
   * [E] (Tuỳ chọn) Thanh chọn mùa cũ – giữ để tương thích giao diện cũ
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
   * [F] MOUNT
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
