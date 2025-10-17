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
        <a class="brand" title="NiNi — Funny">
          <span class="logo" aria-hidden="true"></span>
          <span class="slogan">chơi mê ly, bứt phá tư duy</span>
        </a>

        <nav class="tabs" aria-label="NiNi sections">
          <a class="tab" data-tab="Gioithieu" href="${ROUTES.Gioithieu.hash}">Gioi thieu</a>
          <a class="tab" data-tab="Luatchoi" href="${ROUTES.Luatchoi.hash}">Luat choi</a>
          <a class="tab" data-tab="Diendan"  href="${ROUTES.Diendan.hash}">Dien dan</a>
          <a class="tab" data-tab="Lienhe"  href="${ROUTES.Lienhe.hash}">Lien he</a>
        </nav>
      </div>
    `;
  }

  // ---------- view templates ----------
  const TPL = {
    Gioithieu(){
      return `
        <h1>Giới thiệu</h1>
    <p>Bạn có nghĩ việc học tiếng Anh là một thử thách khó nhằn và đầy áp lực không? Hãy quên đi cách học truyền thống và khám phá một thế giới hoàn toàn mới với <strong>NiNi — Funny</strong>!</p>
    <p>Với slogan "Chơi mê ly, bứt phá tư duy", NiNi-Funny không chỉ là một trò chơi giải trí, mà còn là công cụ giúp bạn:</p>
    <ul>
      <li>Đắm chìm vào cuộc phiêu lưu: Khám phá những màn chơi đầy màu sắc, giải đố những câu chuyện hấp dẫn và chinh phục các thử thách ngôn ngữ một cách tự nhiên.</li>
      <li>Học mà như chơi: Mở rộng vốn từ vựng, rèn luyện ngữ pháp và tăng khả năng phản xạ tiếng Anh thông qua các mini-game vui nhộn và sáng tạo.</li>
      <li>Phát triển bản thân: Bứt phá khỏi những giới hạn của bản thân, tư duy logic và kỹ năng giải quyết vấn đề của bạn sẽ được nâng cao một cách đáng kể.</li>
    </ul>
      <p>Hãy tải <strong>NiNi — Funny</strong> ngay hôm nay và bắt đầu hành trình biến tiếng Anh thành một niềm vui bất tận.</p>
      `;
    },
    Luatchoi(){
      return `
        <h2>🎬 Luật chơi</h2>
        <h1>Luật chơi cơ bản</h1>
    <ol>
      <li>Đăng nhập để lưu tiến độ & điểm.</li>
      <li>Chọn “mùa” để vào màn chơi tương ứng.</li>
      <li>Hoàn thành nhiệm vụ mini-game để nhận điểm.</li>
      <li>Đổi điểm lấy huy hiệu hoặc quà tặng theo event.</li>
    </ol>
    <p>Mọi hành vi gian lận sẽ bị hệ thống từ chối điểm thưởng.</p>
      `;
    },
    Diendan(){
      return `
        <h2>🎮 Diễn đàn</h2>
        <h1>cung choi nao</h1>
    
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








