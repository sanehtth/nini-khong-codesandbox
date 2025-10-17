/* ===== NiNi — Header Tabs (logo+slogan + Storybook/Video/Game/Shop) =====
   - Render header vào #nini_header
   - Điều hướng bằng hash: #/story | #/video | #/game | #/shop
   - Render nội dung vào khung card ở giữa (tự tạo nếu chưa có)
=========================================================================== */

(function(){
  const N = (window.NINI = window.NINI || {});
  if (N._wiredHeaderTabs) return;
  N._wiredHeaderTabs = true;

  const ROUTES = {
    gioithieu : { title: 'Giới thiệu', hash: '#/gioithieu' },
    luatchoi : { title: 'Luật chơi',      hash: '#/luatchoi' },
    diendan  : { title: 'Diễn đàn',       hash: '#/diendan'  },
    Lienhe  : { title: 'Liên hệ',       hash: '#/lienhe'  },
  };

  // ---------- ensure stage card ----------
  function ensureStage(){
    let stage = document.getElementById('stage');
    if (!stage){
      stage = document.createElement('main');
      stage.id = 'stage';
      stage.className = 'stage';
      document.body.appendChild(stage);
    }
    let card = document.getElementById('stageCard');
    if (!card){
      card = document.createElement('section');
      card.id = 'stageCard';
      card.className = 'stage-card';
      stage.appendChild(card);
    }
    return card;
  }

  // ---------- header render ----------
  function renderHeader(){
    const root = document.getElementById('nini_header') || (() => {
      const h = document.createElement('header'); h.id = 'nini_header'; document.body.prepend(h); return h;
    })();

    root.innerHTML = `
      <div class="bar">
        <a class="brand" href="/#/story" title="NiNi — Funny">
          <span class="logo" aria-hidden="true"></span>
          <span class="slogan">chơi mê ly, bứt phá tư duy</span>
        </a>

        <nav class="tabs" aria-label="NiNi sections">
          <a class="tab" data-tab="gioithieu" href="${ROUTES.gioithieu.hash}">Gioi thieu</a>
          <a class="tab" data-tab="luatchoi" href="${ROUTES.luatchoi.hash}">Luat choi</a>
          <a class="tab" data-tab="diendan"  href="${ROUTES.diendan.hash}">Dien dan</a>
          <a class="tab" data-tab="lienhe"  href="${ROUTES.lienhe.hash}">Lien he</a>
        </nav>
      </div>
    `;
  }

  // ---------- view templates ----------
  const TPL = {
    story(){
      return `
        <h2>📖 Storybook</h2>
        <div class="grid cols-2">
          <div class="card">
            <h3>Chiến binh rừng xanh</h3>
            <p>Câu chuyện về NiNi khám phá khu rừng trí tuệ, giải đố qua từng mùa.</p>
            <a class="btn" href="#">Đọc ngay</a>
          </div>
          <div class="card">
            <h3>Bí mật của những vì sao</h3>
            <p>Những thử thách nhỏ giúp bé luyện tập tư duy và tưởng tượng.</p>
            <a class="btn" href="#">Đọc ngay</a>
          </div>
        </div>
      `;
    },
    video(){
      return `
        <h2>🎬 Video</h2>
        <div class="grid cols-2">
          <div class="video-wrap">
            <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" title="Video 1" allowfullscreen></iframe>
          </div>
          <div class="video-wrap">
            <iframe src="https://www.youtube.com/embed/oHg5SJYRHA0" title="Video 2" allowfullscreen></iframe>
          </div>
        </div>
      `;
    },
    game(){
      return `
        <h2>🎮 Game</h2>
        <div class="grid cols-3">
          <div class="card">
            <h3>Ghép hình nhanh</h3>
            <p>Rèn phản xạ và quan sát.</p>
            <a class="btn" href="#">Chơi</a>
          </div>
          <div class="card">
            <h3>Số học vui</h3>
            <p>Cộng trừ nhân chia cực chill.</p>
            <a class="btn" href="#">Chơi</a>
          </div>
          <div class="card">
            <h3>Đường rừng</h3>
            <p>Dẫn NiNi qua mê cung rừng xanh.</p>
            <a class="btn" href="#">Chơi</a>
          </div>
        </div>
      `;
    },
    shop(){
      return `
        <h2>🛍️ Shop</h2>
        <div class="grid cols-3">
          <div class="card">
            <h3>Sticker NiNi</h3>
            <p>Bộ 20 sticker dễ thương.</p>
            <a class="btn" href="#">Xem</a>
          </div>
          <div class="card">
            <h3>Sổ tay giải đố</h3>
            <p>100 thử thách tư duy.</p>
            <a class="btn" href="#">Xem</a>
          </div>
          <div class="card">
            <h3>Áo thun NiNi</h3>
            <p>Chất cotton mềm, unisex.</p>
            <a class="btn" href="#">Xem</a>
          </div>
        </div>
      `;
    }
  };

  // ---------- router ----------
  function getRouteFromHash(){
    const h = (location.hash || '').toLowerCase();
    if (h.startsWith('#/video')) return 'video';
    if (h.startsWith('#/game'))  return 'game';
    if (h.startsWith('#/shop'))  return 'shop';
    return 'story';
  }

  function setActiveTab(name){
    document.querySelectorAll('#nini_header .tab').forEach(a=>{
      a.setAttribute('aria-current', a.dataset.tab===name ? 'page' : 'false');
    });
  }

  function renderRoute(){
    const name = getRouteFromHash();
    const card = ensureStage();
    const view = TPL[name] ? TPL[name]() : '<p>Không tìm thấy nội dung.</p>';
    card.innerHTML = view;
    setActiveTab(name);
  }

  // ---------- boot ----------
  function boot(){
    renderHeader();
    renderRoute();
    window.addEventListener('hashchange', renderRoute);
    // khi click tab, chỉ đổi hash; nội dung renderRoute sẽ chạy
  }

  if (document.readyState !== 'loading') boot();
  else document.addEventListener('DOMContentLoaded', boot);
})();

