;(() => {
  const N = window.NINI;

  function renderStage(root) {
    root.innerHTML = `
      <div class="nini-layout">
  <!-- Sidebar (trái) -->
  <aside class="nini-side glass">
    <div class="side-head">
      <span class="plus">+</span>
      <span class="create">Tạo mới</span>
    </div>
      // đặt ngay trên renderStage để dễ chỉnh
  const SIDE_ITEMS = [
    { key: "storybook", label: "Storybook", icon: "/public/assets/icons/book.webp", href: "#/home" },
    { key: "video",     label: "Video",     icon: "/public/assets/icons/video.webp", href: "#/video" },
    { key: "game",      label: "Game",      icon: "/public/assets/icons/game.webp",  href: "#/game"  },
    { key: "shop",      label: "Shop",      icon: "/public/assets/icons/shop.webp",  href: "#/shop"  },
    { key: "note",      label: "Thông báo", icon: "/public/assets/icons/note.webp",  href: "#/notify"},
    { key: "chat",      label: "Chat",      icon: "/public/assets/icons/chat.webp",  href: "#/chat"  },
    { key: "setting",   label: "Cài đặt",   icon: "/public/assets/icons/setting.webp", href: "#/settings" },
    { key: "user",      label: "Cá nhân",   icon: "/public/assets/icons/user.webp", href: "#/profile" },
  ];

  </aside>

  <!-- Storybook (cột giữa) -->
  <section class="nini-middle">
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
  </section>

  <!-- Main (phải) -->
  <main class="nini-main">
    <!-- panel 1: search + quick actions + recents -->
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
        <a href="#" class="seeall">Xem tất cả ›</a>
      </div>

      <div id="recent_grid" class="recents"></div>
    </section>

    <!-- panel 2: assignments -->
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

    // mock cards
    const recents = [
      {title:"Food & Restaurant FAQs Doc in Green", type:"Doc",  edited:"2 days ago", img:"https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=800&auto=format&fit=crop"},
      {title:"One Pager Doc in Black and White",    type:"Doc",  edited:"2 days ago", img:"https://images.unsplash.com/photo-1486427944299-d1955d23e34d?q=80&w=800&auto=format&fit=crop"},
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
      N.setSeason(btn.dataset.season);
    });
  }

  N.mountOnce('#stage', renderStage);
  N.mountOnce('#season_nav', renderSeasonsNav);
})();


