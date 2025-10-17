/* =========================================================================
 *  stage.js — Trang Home kiểu Canva (HTML + JS thuần, không cần build)
 *  - Bố cục 3 cột: Sidebar (icon) | Storybook (+ Shop) | Main
 *  - Nền rừng giữ nguyên; các khung glass trong mờ
 *  - Có mock Recent designs (thay bằng data thật sau)
 *  - Phụ thuộc tiện ích N.mountOnce trong core.js của bạn
 * ========================================================================= */

;(() => {
  // Lấy namespace app hiện có (do bạn khởi tạo trong core.js)
  const N = window.NINI || {};

  /* -----------------------------------------------------------------------
   * [A] CẤU HÌNH SIDEBAR ICON
   * - Đổi label, icon, href tại đây
   * - Đường dẫn icon: đổi /assets/... -> /public/assets/... nếu cần
   * ----------------------------------------------------------------------- */
  const SIDE_ITEMS = [
    { key: "storybook", label: "Storybook", icon: "/public/assets/icons/book.webp",   href: "#/home"     },
    { key: "video",     label: "Video",     icon: "/public/assets/icons/video.webp",  href: "#/video"    },
    { key: "game",      label: "Game",      icon: "/public/assets/icons/game.webp",   href: "#/game"     },
    { key: "shop",      label: "Shop",      icon: "/public/assets/icons/shop.webp",   href: "#/shop"     },
    { key: "note",      label: "Thông báo", icon: "/public/assets/icons/note.webp",   href: "#/notify"   },
    { key: "chat",      label: "Chat",      icon: "/public/assets/icons/chat.webp",   href: "#/chat"     },
    { key: "setting",   label: "Cài đặt",   icon: "/public/assets/icons/setting.webp",href: "#/settings" },
    { key: "user",      label: "Cá nhân",   icon: "/public/assets/icons/user.webp",   href: "#/profile"  },
  ];
  /* --------------------------- HẾT PHẦN [A] ------------------------------ */

  /* -----------------------------------------------------------------------
   * [B] HÀM RENDER TRANG CHÍNH
   * - Tạo khung HTML 3 cột và các panel glass
   * - Gọi sau cùng: N.mountOnce('#stage', renderStage)
   * ----------------------------------------------------------------------- */
  function renderStage(root) {
    root.innerHTML = `
      <div class="nini-canvas"><!-- giữ nền rừng từ CSS global của bạn -->

        <div class="nini-layout"><!-- BỐ CỤC 3 CỘT: Sidebar | Middle | Main -->

          <!-- [B1] SIDEBAR ICON (TRÁI) - BẮT ĐẦU -->
          <aside class="nini-side glass">
  <div class="side-icons">
    ${SIDE_ITEMS.map((it, i) => `
      <a href="${it.href}" class="icon-btn ${i===0?'active':''}" data-key="${it.key}" aria-label="${it.label}">
        <span class="icon">
          <img src="${it.icon}" alt="${it.label}" loading="lazy"/>
        </span>
        <span class="lbl">${it.label}</span>
      </a>
    `).join("")}
  </div>
</aside>

          <!-- [B1] SIDEBAR ICON (TRÁI) - KẾT THÚC -->

          <!-- [B2] CỘT GIỮA: STORYBOOK + SHOP - BẮT ĐẦU -->
          <section class="nini-middle">
            <!-- STORYBOOK PANEL -->
            <section class="panel glass storybook">
              <div class="sb-head">📚 Storybook</div>
              <div class="sb-grid">
                <article class="sb-card">
                  <h4>Chiến binh rừng xanh</h4>
                  <p>Câu chuyện về NiNi khám phá khu rừng trí tuệ, giải đố qua từng mùa.</p>
                  <a href="#/storybook/forest" class="btn">Đọc ngay</a>
                </article>
                <article class="sb-card">
                  <h4>Bí mật của những vì sao</h4>
                  <p>Những thử thách nhỏ giúp bé luyện tập tư duy và tưởng tượng.</p>
                  <a href="#/storybook/stars" class="btn">Đọc ngay</a>
                </article>
              </div>
            </section>

            <!-- SHOP PANEL (ở dưới Storybook) -->
            <section class="panel glass shop">
              <div class="sb-head">🛍️ Shop</div>
              <div class="shop-grid">
                <article class="shop-card">
                  <h4>Sticker NiNi</h4>
                  <p>Bộ 20 sticker dễ thương.</p>
                  <a href="#/shop/sticker" class="btn">Xem</a>
                </article>
                <article class="shop-card">
                  <h4>Sổ tay giải đố</h4>
                  <p>100 thử thách tư duy.</p>
                  <a href="#/shop/notebook" class="btn">Xem</a>
                </article>
                <article class="shop-card">
                  <h4>Áo thun NiNi</h4>
                  <p>Cotton mềm, unisex.</p>
                  <a href="#/shop/tshirt" class="btn">Xem</a>
                </article>
              </div>
            </section>
          </section>
          <!-- [B2] CỘT GIỮA - KẾT THÚC -->

          <!-- [B3] CỘT PHẢI (MAIN): Search + Quick actions + Recent + Assignments -->
          <main class="nini-main">
            <!-- Panel: Search + Quick actions + Recent designs -->
            <section class="panel glass">
              <!-- Ô tìm kiếm -->
              <div class="search">
                <input type="text" placeholder="Mô tả ý tưởng, mình sẽ giúp bạn tạo..." />
                <span class="ico">🔎</span>
              </div>

              <!-- Quick actions -->
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

              <!-- Recent designs -->
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
          <!-- [B3] CỘT PHẢI (MAIN) - KẾT THÚC -->

        </div><!-- /nini-layout -->
      </div><!-- /nini-canvas -->
    `;

    /* ---------------------------------------------------------------------
     * [B.x] SAU KHI GÁN HTML: set trạng thái active cho sidebar theo URL
     * ------------------------------------------------------------------- */
    const cur = (location.hash.split("/")[1] || "home");
    document.querySelectorAll(".icon-btn").forEach(a => {
      a.classList.toggle("active", a.getAttribute("href").includes(cur));
    });

    /* ---------------------------------------------------------------------
     * [B.y] RENDER MOCK "RECENT DESIGNS"
     * - Thay bằng fetch JSON / Firestore nếu cần
     * ------------------------------------------------------------------- */
    const recents = [
      {title:"Food & Restaurant FAQs Doc in Green", type:"Doc",    edited:"2 days ago", img:"https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=800&auto=format&fit=crop"},
      {title:"One Pager Doc in Black and White",    type:"Doc",    edited:"2 days ago", img:"https://images.unsplash.com/photo-1486427944299-d1955d23e34d?q=80&w=800&auto=format&fit=crop"},
      {title:"Classroom Fun Poster",                 type:"Design", edited:"2 days ago", img:"https://images.unsplash.com/photo-1516387938699-a93567ec168e?q=80&w=800&auto=format&fit=crop"},
    ];
    const grid = root.querySelector('#recent_grid');
    grid.innerHTML = recents.map(x => `
      <article class="card">
        <div class="thumb"><img src="${x.img}" alt=""></div>
        <div class="meta">
          <p class="ttl">${x.title}</p>
          <p class="sub">${x.type} • Edited ${x.edited}</p>
        </div>
      </article>
    `).join('');
  }
  /* --------------------------- HẾT PHẦN [B] ------------------------------ */

  /* -----------------------------------------------------------------------
   * [C] THANH CHỌN MÙA — nếu trang của bạn có #season_nav
   * - Giữ để tương thích với giao diện cũ
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
  /* --------------------------- HẾT PHẦN [C] ------------------------------ */

  /* -----------------------------------------------------------------------
   * [D] MOUNT VÀO DOM
   * - mountOnce là tiện ích của bạn: chỉ mount 1 lần theo selector
   * ----------------------------------------------------------------------- */
  if (typeof N.mountOnce === 'function') {
    N.mountOnce('#stage', renderStage);
    N.mountOnce('#season_nav', renderSeasonsNav);
  } else {
    // fallback nếu không có mountOnce
    const stageEl = document.querySelector('#stage');
    if (stageEl) renderStage(stageEl);
    const navEl = document.querySelector('#season_nav');
    if (navEl) renderSeasonsNav(navEl);
  }
  /* --------------------------- HẾT PHẦN [D] ------------------------------ */

})();


