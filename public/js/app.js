/* ====== Ảnh từng mùa ====== */
const SEASON_SRC = {
  home:   'public/assets/bg/nini_home.webp',
  spring: 'public/assets/images/seasons/spring.webp',
  summer: 'public/assets/images/seasons/summer.webp',
  autumn: 'public/assets/images/seasons/autumn.webp',
  winter: 'public/assets/images/seasons/winter.webp',
};

const root = document.documentElement;
const body = document.body;

/* ====== Cross-fade đổi mùa ====== */
let swappingTimer = null;
function setSeason(season){
  if (!(season in SEASON_SRC)) season = 'home';

  const next = `url("${SEASON_SRC[season]}")`;
  root.style.setProperty('--season-url-next', next);

  // active tab
  document.querySelectorAll('.tab').forEach(t=>{
    t.classList.toggle('is-active', t.dataset.season === season);
  });

  body.classList.remove('season-home','season-spring','season-summer','season-autumn','season-winter');
  body.classList.add(`season-${season}`);

  body.classList.add('is-swapping');
  clearTimeout(swappingTimer);
  swappingTimer = setTimeout(()=>{
    root.style.setProperty('--season-url', next);
    body.classList.remove('is-swapping');
  }, 460);
}

/* ====== Điều hướng qua hash (an toàn nếu JS tải chậm) ====== */
const VALID = ['home','spring','summer','autumn','winter'];

function getSeasonFromHash(){
  const h = (location.hash || '#home').replace('#','').toLowerCase();
  return VALID.includes(h) ? h : 'home';
}
function applySeasonFromHash(){
  setSeason(getSeasonFromHash());
}

window.addEventListener('hashchange', applySeasonFromHash);
window.addEventListener('DOMContentLoaded', () => {
  // Cho chắc: click tab đổi hash (để đồng bộ khi mở nhiều tab)
  document.querySelectorAll('.tab').forEach(a=>{
    a.addEventListener('click', (e)=>{
      // Anchor đã đổi hash rồi, không cần preventDefault
      // Nhưng nếu server thêm base, vẫn đảm bảo không rời trang:
      if (a.getAttribute('href')?.startsWith('#') === false) e.preventDefault();
    });
  });

  applySeasonFromHash();
});

/* ====== 4 nút nội dung ====== */
const pillMap = {
  about:   { title: 'NiNi — Funny', text: 'Thế giới mini game cho bé: khám phá, học hỏi và vui cùng NiNi.' },
  rules:   { title: 'Luật chơi',     text: 'Mỗi trò có hướng dẫn riêng; bé hoàn thành nhiệm vụ để nhận điểm sao và huy hiệu.' },
  forum:   { title: 'Diễn đàn',      text: 'Nơi cập nhật thông báo, mẹo chơi, sự kiện mới. Sắp có bình luận an toàn cho bé.' },
  feedback:{ title: 'Góp ý',         text: 'Bạn có ý tưởng trò chơi hoặc phát hiện lỗi? Hãy góp ý để NiNi tốt hơn!' },
};
const infoTitle = document.getElementById('infoTitle');
const infoText  = document.getElementById('infoText');
const infoPanel = document.getElementById('infoPanel');

document.querySelectorAll('.footer-actions .pill').forEach(p=>{
  p.addEventListener('click', ()=>{
    document.querySelectorAll('.footer-actions .pill').forEach(x=>x.classList.remove('is-active'));
    p.classList.add('is-active');
    const key = p.dataset.target || 'about';
    const data = pillMap[key];
    infoTitle.textContent = data.title;
    infoText.textContent  = data.text;
    infoPanel.scrollIntoView({behavior:'smooth', block:'start'});
  });
});

// debug flag (để bạn mở console kiểm tra nhanh)
window.__nini_ok = 'app.js loaded';
