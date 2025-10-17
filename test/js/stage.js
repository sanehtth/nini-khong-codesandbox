/* =========================================================================
 *  stage.js — Trang Home kiểu Canva (HTML + JS thuần)
 *  - Sidebar icon (dùng /public/assets/icons/...)
 *  - Storybook hiển thị ở cột giữa, click truyện => xem ở cột phải
 *  - Vẫn còn mock Recent designs (có thể thay bằng dữ liệu thật sau)
 * ========================================================================= */

;(() => {
  const N = window.NINI || {};

  /* -----------------------------------------------------------------------
   * [A] CẤU HÌNH — ICON SIDEBAR & DỮ LIỆU STORYBOOK
   * ----------------------------------------------------------------------- */

  // Sidebar items (icon + nhãn + href)
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

  // Dữ liệu demo Storybook
  const STORIES = [
    {
      id: "forest-warrior",
      title: "Chiến binh rừng xanh",
      summary: "NiNi khám phá khu rừng trí tuệ, giải đố qua từng mùa.",
      body: `
        <p>Chương 1 — Bước vào cánh rừng: NiNi nhận được tấm bản đồ với 4 biểu tượng mùa Xuân/Hạ/Thu/Đông.</p>
        <p>Chương 2 — Cửa ải đầu tiên: NiNi giải câu đố ánh sáng để mở đường tới thác nước.</p>
        <p>Chương 3 — Bạn đồng hành: Gặp Cú Mèo, học cách ghép ký tự để mở kho báu.</p>
      `
    },
    {
      id: "secret-of-stars",
      title: "Bí mật của những vì sao",
      summary: "Những thử thách nhỏ giúp bé luyện tập tư duy và tưởng tượng.",
      body: `
        <p>Chương 1 — Bầu trời đêm: Tạo chòm sao bằng cách nối các điểm sáng.</p>
        <p>Chương 2 — Tín hiệu từ xa: Giải mã thông điệp bằng bảng thay thế chữ cái.</p>
        <p>Chương 3 — Ước mơ của NiNi: Viết điều ước và gửi lên dải ngân hà.</p>
      `
    }
  ];

  const RECENTS = [
    {title:"Food & Restaurant FAQs Doc in Green", type:"Doc",    edited:"2 days ago", img:"https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=800&auto=format&fit=crop"},
    {title:"One Pager Doc in Black and White",    type:"Doc",    edited:"2 days ago", img:"https://images.unsplash.com/photo-1486427944299-d1955d23e34d?q=80&w=800&auto=format&fit=crop"},
    {title:"Classroom Fun Poster",                type:"Design", edited:"2 days ago", img:"https://images.unsplash.com/photo-1516387938699-a93567ec168e?q=80&w=800&auto=format&fit=crop"},
  ];

  /* --------------------------- HẾT PHẦN [A] ------------------------------ */


  /* -----------------------------------------------------------------------
   * [B] HÀM HỖ TRỢ RENDER
   * ----------------------------------------------------------------------- */

  // HTML: 1 card recent
  const recentCard = (x) => `
    <article class="card">
      <div class="thumb"><img src="${x.img}" alt=""></div>
      <div class="meta">
        <p class="ttl">${x.title}</p>
        <p class="sub">${x.type} • Edited ${x.edited}</p>
      </div>
    </article>
  `;

  // HTML: list Storybook (ở cột giữa)
  const storyListHTML = (items) => `
    <section class="panel glass storybook">
      <div class="sb-head">📚 Storybook</div>
      <div class="sb-grid">
        ${items.map(s => `
          <article class="sb-card">
            <h4 class="sb-title" data-story="${s.id}">${s.title}</h4>
            <p>${s.summary}</p>
            <button class="btn sb-open" data-story="${s.id}">Đọc ngay</button>
          </article>
        `).join("")}
      </div>
    </section>
  `;

  // HTML: shop panel (cột giữa, phía dưới)
  const shopHTML = () => `
    <section class="panel glass shop">
      <div class="sb-head">🛍️ Shop</div>
      <div class="shop-grid">
        <article class="shop-card"><h4>Sticker NiNi</h4><p>Bộ 20 sticker dễ thương.</p><a href="#/shop/sticker" class="btn">Xem</a></article>
        <article class="shop-card"><h4>Sổ tay giải đố</h4><p>100 thử thách tư duy.</p><a href="#/shop/notebook" class="btn">Xem</a></article>
        <article class="shop-card"><h4>Áo thun NiNi</h4><p>Cotton mềm, unisex.</p><a href="#/shop/tshirt" class="btn">Xem</a></article>
      </div>
    </section>
  `;

  // HTML: khung hiển thị truyện chi tiết (ở cột phải, trên “Recent”)
  const storyDetailHTML = (s) => `
    <section class="panel glass story-detail">
      <div class="panel-head">
        <h2>${s.title}</h2>
        <button class="seeall sb-close">Đóng ›</button>
      </div>
      <div class="story-body">${s.body}</div>
    </section>
  `;

  /* --------------------------- HẾT PHẦN [B] ------------------------------ */


  /* -----------------------------------------------------------------------
   * [C] RENDER TRANG
   * ----------------------------------------------------------------------- */
  function renderStage(root) {
    root.innerHTML = `
      <div class="nini-canvas">
        <div class="nini-layout">

          <!-- SIDEBAR ICON -->
          <aside class="nini-side glass">
            <div class="side-icons">
              ${SIDE_ITEMS.map((it,i)=>`
                <a href="${it.href}" class="icon-btn ${i===0?'active':''}" data-key="${it.key}" aria-label="${it.label}">
                  <span class="icon"><img src="${it.icon}" alt="${it.label}" loading="lazy"/></span>
                  <span class="lbl">${it.label}</span>
                </a>
              `).join("")}
            </div>
          </aside>

          <!-- CỘT GIỮA: STORYBOOK + SHOP -->
          <section class="nini-middle">
            ${storyListHTML(STORIES)}
            ${shopHTML()}
          </section>

          <!-- CỘT PHẢI: SEARCH + QUICK + (STORY DETAIL) + RECENT + ASSIGNMENTS -->
          <main class="nini-main">

            <!-- chỗ sẽ render truyện chi tiết khi click -->
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

    // Active theo hash hiện tại
    const cur = (location.hash.split("/")[1] || "home");
    document.querySelectorAll(".icon-btn").forEach(a=>{
      a.classList.toggle("active", a.getAttribute("href").includes(cur));
    });

    // Render recents
    const grid = root.querySelector('#recent_grid');
    grid.innerHTML = RECENTS.map(recentCard).join('');

    // GẮN SỰ KIỆN: click Storybook ở sidebar => nạp lại danh sách story
    root.querySelectorAll('.icon-btn[data-key="storybook"]').forEach(btn=>{
      btn.addEventListener('click', (e)=>{
        // Ngăn trang nhảy hash nếu muốn
        // e.preventDefault();
        const mid = root.querySelector('.nini-middle');
        if (mid) {
          mid.innerHTML = storyListHTML(STORIES) + shopHTML(); // story + shop
          attachStoryEvents(root); // gắn lại click cho tiêu đề/btn "Đọc ngay"
        }
      });
    });

    // Gắn sự kiện cho các tiêu đề/btn trong Storybook lần đầu
    attachStoryEvents(root);
  }

  // Gắn click vào tiêu đề/btn truyện -> render chi tiết bên phải
  function attachStoryEvents(root){
    root.querySelectorAll('.sb-title, .sb-open').forEach(el=>{
      el.addEventListener('click', ()=>{
        const id = el.getAttribute('data-story');
        const story = STORIES.find(s=>s.id===id);
        if (!story) return;
        const holder = root.querySelector('#detail-holder');
        if (holder){
          holder.innerHTML = storyDetailHTML(story);

          // nút đóng chi tiết
          const closeBtn = holder.querySelector('.sb-close');
          if (closeBtn){
            closeBtn.addEventListener('click', ()=>{
              holder.innerHTML = ''; // xóa panel chi tiết
            });
          }
          // Cuộn lên chỗ chi tiết (tùy)
          holder.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  /* -----------------------------------------------------------------------
   * [D] Thanh chọn mùa (nếu bạn còn dùng)
   * ----------------------------------------------------------------------- */
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
   * [E] Mount
   * ----------------------------------------------------------------------- */
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
