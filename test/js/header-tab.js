/* ===== NiNi — Header Tabs (logo+slogan + Gioithieu/Luatchoi/Diandan/Lienhe) =====
   - Render header vào #nini_header
   - Điều hướng bằng hash: #/Gioithieu | #/Luatchoi | #/Diendan | #/Lienhe
   - Render nội dung vào khung card ở giữa (tự tạo nếu chưa có)
=========================================================================== */

(function(){
  const N = (window.NINI = window.NINI || {});
  if (N._wiredHeaderTabs) return;
  N._wiredHeaderTabs = true;

  const ROUTES = {
    Gioithieu : { title: 'Giới thiệu', hash: '#/Gioithieu' },
    Luatchoi : { title: 'Luật chơi',      hash: '#/Luatchoi' },
    Diendan  : { title: 'Diễn đàn',       hash: '#/Diendan'  },
    Lienhe  : { title: 'Liên hệ',       hash: '#/Lienhe'  },
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
        <a class="brand" href="/#/Gioithieu" title="NiNi — Funny">
          <span class="logo" aria-hidden="true"></span>
          <span class="slogan">chơi mê ly, bứt phá tư duy</span>
        </a>

        <nav class="tabs" aria-label="NiNi sections">
          <a class="tab" data-tab="Gioithieu" href="${ROUTES.Gioithieu.hash}">Gioi thieu</a>
          <a class="tab" data-tab="Luatchoi" href="${ROUTES.Luatchoi.hash}">Luat choi</a>
          <a class="tab" data-tab="Diendan"  href="${ROUTES.Giendan.hash}">Dien dan</a>
          <a class="tab" data-tab="Lienhe"  href="${ROUTES.Lienhe.hash}">Lien he</a>
        </nav>
      </div>
    `;
  }

  // ---------- view templates ----------
  const TPL = {
    Gioithieu(){
      return `
        <h2>📖 Giới thiệu</h2>
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
    Luatchoi(){
      return `
        <h2>🎬 Luật chơi</h2>
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
    Diendan(){
      return `
        <h2>🎮 Diễn đàn</h2>
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
    Lienhe(){
      return `
        <h2>🛍️ Liên hệ</h2>
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
    if (h.startsWith('#/Luatchoi')) return 'Luatchoi';
    if (h.startsWith('#/Diendan'))  return 'Diendan';
    if (h.startsWith('#/Lienhe'))  return 'Lienhe';
    return 'Gioithieu';
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



