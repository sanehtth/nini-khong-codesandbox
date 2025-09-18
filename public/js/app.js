/* ========= Cấu hình ảnh mùa ========= */
const SEASON_SRC = {
  home:   'public/assets/bg/nini_home.webp',
  spring: 'public/assets/images/seasons/spring.webp',
  summer: 'public/assets/images/seasons/summer.webp',
  autumn: 'public/assets/images/seasons/autumn.webp',
  winter: 'public/assets/images/seasons/winter.webp',
};

const root = document.documentElement;
const body = document.body;

/* ========= Cross-fade đổi mùa ========= */
let swappingTimer = null;
function setSeason(season){
  const next = `url("${SEASON_SRC[season]}")`;

  // set ảnh kế tiếp cho lớp ::after (cả body và frame dùng chung biến này)
  root.style.setProperty('--season-url-next', next);

  // active tab
  document.querySelectorAll('.tab').forEach(t=>{
    t.classList.toggle('is-active', t.dataset.season === season);
  });

  // class body phục vụ map fallback & style
  body.classList.remove('season-home','season-spring','season-summer','season-autumn','season-winter');
  body.classList.add(`season-${season}`);

  // bật cross-fade
  body.classList.add('is-swapping');
  clearTimeout(swappingTimer);
  swappingTimer = setTimeout(()=>{
    // sau khi fade xong, gán ảnh mới thành ảnh hiện tại
    root.style.setProperty('--season-url', next);
    body.classList.remove('is-swapping');
  }, 460);
}

/* ========= Tabs mùa ========= */
document.querySelectorAll('.tab').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const season = btn.dataset.season;
    if(!SEASON_SRC[season]) return;
    setSeason(season);
  });
});

/* ========= Footer pills (panel text) ========= */
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

/* ========= Khởi tạo ========= */
window.addEventListener('DOMContentLoaded', ()=>{
  setSeason('home');  // Home = nini_home.webp
});
